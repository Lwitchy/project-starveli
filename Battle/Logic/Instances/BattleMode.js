const BitStream = require('../../ByteStream/BitStream');
const ByteStream = require('../../ByteStream');
const VisionUpdateMessage = require('../../Protocol/Messages/Server/VisionUpdateMessage');
const LogicCharacter = require('../Battle/LogicCharacter');
const LogicVector2 = require('../LogicVector2');
const Poison = require('../Battle/Poison');
const LogicTileMap = require('../Battle/LogicTileMap');
const { LogicBox } = require('../Battle/LogicBox');

const DEFAULT_TICK_RATE = 20;
const MAX_CATCH_UP_TICKS = 4;
const INITIAL_VISION_BUFFER_BYTES = 4096;
const INITIAL_PACKET_BUFFER_BYTES = 4608;

function nsToMs(value) {
    return Number(value) / 1e6;
}

class BattleMode {
    constructor(locationId) {
        this.locationId = locationId;
        this.players = [];
        this.playersBySessionId = new Map();
        this.gameObjects = [];
        this.tickCount = 0;
        this.timer = null;
        this.isStarted = false;
        this.isGameOver = false;

        this.winnerTeam = -1;
        this.playerObjectIdxCounter = 0;
        this.objectReferenceSeed = 16;

        this.tileMap = LogicTileMap.fromLocationId(locationId);
        this.availableSpawns = this.tileMap.getPlayerSpawns();

        for (let i = this.availableSpawns.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.availableSpawns[i], this.availableSpawns[j]] = [this.availableSpawns[j], this.availableSpawns[i]];
        }

        this.spawnBoxes();

        this.tickRate = Number(global.config?.battle?.tickRate) || DEFAULT_TICK_RATE;
        this.tickIntervalNs = BigInt(Math.round(1_000_000_000 / this.tickRate));
        this.tickDurationMs = nsToMs(this.tickIntervalNs);
        this.maxCatchUpTicks = MAX_CATCH_UP_TICKS;
        this.maxAccumulatedTimeNs = this.tickIntervalNs * BigInt(this.maxCatchUpTicks);
        this.accumulatorNs = 0n;
        this.lastLoopTimeNs = 0n;
        this.runLoopBound = this.runLoop.bind(this);
        this.debugLoggingEnabled = global.config?.logging?.level === 'debug';
        this.performanceLogIntervalTicks = Math.max(this.tickRate * 5, this.tickRate);

        this.tickPerformance = {
            lastTickDurationNs: 0n,
            avgTickDurationNs: 0n,
            maxTickDurationNs: 0n,
            lastFrameTimeNs: 0n,
            lastTicksProcessed: 0,
            overrunCount: 0,
            droppedTicks: 0,
            totalTicks: 0,
            lastTickStartedAtNs: 0n,
            lastTickCompletedAtNs: 0n
        };
    }

    spawnBoxes() {
        const boxSpawns = this.tileMap.getBoxSpawns();
        for (const pos of boxSpawns) {
            const box = new LogicBox(0, pos.x, pos.y);
            box.objectIdx = this.objectReferenceSeed++;
            this.gameObjects.push(box);
        }
    }

    addPlayer(udpClient) {
        udpClient.battle = this;
        this.players.push(udpClient);
        this.playersBySessionId.set(String(udpClient.sessionId), udpClient);

        const brawlerId = udpClient.player.battleBrawlerId || 0;
        const bdata = (global.battleData && global.battleData[brawlerId]) || null;
        if (bdata) {
            udpClient.player.attackData = bdata;
            console.log(`[BattleMode] Player ${udpClient.player.username} using brawler ${bdata.name} (ID ${brawlerId})`);
        } else {
            udpClient.player.attackData = {
                name: 'ShotgunGirl', numBullets: 5, spread: 60, damage: 300,
                castingRange: 23, castingTime: 6, projectileId: 0, projectileSpeed: 3100,
                hitpoints: 3800, speed: 720, rechargeTime: 1500, maxCharge: 3,
            };
            console.log(`[BattleMode] Player ${udpClient.player.username} using fallback Shelly (brawler ${brawlerId} not in battleData)`);
        }

        udpClient.player.character = new LogicCharacter(udpClient.player, udpClient.player.attackData, this.tickDurationMs);

        // Assign a spawn point from map if available
        let spawnPos = { x: 0, y: 0 }; // hardcoded fallback
        if (this.availableSpawns && this.availableSpawns.length > 0) {
            spawnPos = this.availableSpawns.pop();
        }

        // Init physical spawn
        udpClient.player.x = spawnPos.x;
        udpClient.player.y = spawnPos.y;
        udpClient.player.hp = bdata ? bdata.hitpoints : 3800;
        udpClient.player.maxHp = bdata ? bdata.hitpoints : 3800;
        udpClient.player.speed = bdata ? bdata.speed : 720;
        udpClient.player.classId = 16; // datains id 16 - chars
        udpClient.player.instanceId = brawlerId; 

        udpClient.player.objectIdx = this.playerObjectIdxCounter++;
        this.gameObjects.push(udpClient.player);

        udpClient.player.takeDamage = (amt) => {
            udpClient.player.hp -= amt;
            if (udpClient.player.hp < 0) udpClient.player.hp = 0;
        };

        udpClient.player.poison = null;
        udpClient.player.addPoison = (source, damage, tickCount, type) => {
            if (udpClient.player.poison) {
                udpClient.player.poison.refresh(source, damage, tickCount);
            } else {
                const Poison = require('../Battle/Poison');
                udpClient.player.poison = new Poison(source, damage, tickCount, type);
            }
        };

        udpClient.player.powerCubes = 0;
        udpClient.player.pickUpItem = (item) => {
            if (item.instanceId === 9) { // cubes
                udpClient.player.powerCubes++;
                udpClient.player.hp += 400;
                udpClient.player.maxHp += 400;
                console.log(`[Player] ${udpClient.player.name} picked up a Power Cube! Total: ${udpClient.player.powerCubes}`);
            }
        };

        udpClient.player.lastHandledInput = 0;
        udpClient.inputQueue = [];
    }

    queueInput(sessionId, input) {
        const playerSession = this.playersBySessionId.get(String(sessionId));
        if (playerSession) {
            playerSession.inputQueue.push(input);
        }
    }

    start() {
        if (this.isStarted || this.isGameOver) {
            return;
        }

        this.isStarted = true;
        this.accumulatorNs = 0n;
        this.lastLoopTimeNs = process.hrtime.bigint();
        console.log(`[BattleMode] Started battle at location ${this.locationId} (${this.tickRate} TPS / ${this.tickDurationMs.toFixed(2)} ms)`);
        this.scheduleNextLoop(0);
    }

    scheduleNextLoop(delayMs) {
        if (!this.isStarted || this.isGameOver) {
            return;
        }

        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(this.runLoopBound, delayMs);
    }

    stopLoop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.isStarted = false;
    }

    runLoop() {
        if (!this.isStarted || this.isGameOver) {
            return;
        }

        const frameStartNs = process.hrtime.bigint();
        let frameTimeNs = frameStartNs - this.lastLoopTimeNs;
        this.lastLoopTimeNs = frameStartNs;
        this.tickPerformance.lastFrameTimeNs = frameTimeNs;

        if (frameTimeNs > this.maxAccumulatedTimeNs) {
            const skippedFrames = Number(frameTimeNs / this.tickIntervalNs) - this.maxCatchUpTicks;
            if (skippedFrames > 0) {
                this.tickPerformance.droppedTicks += skippedFrames;
            }
            frameTimeNs = this.maxAccumulatedTimeNs;
        }

        this.accumulatorNs += frameTimeNs;

        let ticksProcessed = 0;
        while (this.accumulatorNs >= this.tickIntervalNs && ticksProcessed < this.maxCatchUpTicks && !this.isGameOver) {
            const tickStartedAtNs = process.hrtime.bigint();
            this.executeOneTick();
            const tickCompletedAtNs = process.hrtime.bigint();
            this.recordTickDuration(tickStartedAtNs, tickCompletedAtNs);

            this.accumulatorNs -= this.tickIntervalNs;
            ticksProcessed += 1;
        }

        if (ticksProcessed === this.maxCatchUpTicks && this.accumulatorNs >= this.tickIntervalNs) {
            const droppedTicks = Number(this.accumulatorNs / this.tickIntervalNs);
            this.tickPerformance.droppedTicks += droppedTicks;
            this.accumulatorNs -= this.tickIntervalNs * BigInt(droppedTicks);
        }

        this.tickPerformance.lastTicksProcessed = ticksProcessed;

        if (!this.isStarted || this.isGameOver) {
            return;
        }

        const remainingNs = this.tickIntervalNs - this.accumulatorNs;
        const delayMs = remainingNs > 1_000_000n ? Number(remainingNs / 1_000_000n) : 0;
        this.scheduleNextLoop(delayMs);
    }

    recordTickDuration(startNs, endNs) {
        const durationNs = endNs - startNs;
        const perf = this.tickPerformance;

        perf.lastTickStartedAtNs = startNs;
        perf.lastTickCompletedAtNs = endNs;
        perf.lastTickDurationNs = durationNs;
        perf.totalTicks += 1;

        if (durationNs > perf.maxTickDurationNs) {
            perf.maxTickDurationNs = durationNs;
        }

        if (durationNs > this.tickIntervalNs) {
            perf.overrunCount += 1;
        }

        if (perf.avgTickDurationNs === 0n) {
            perf.avgTickDurationNs = durationNs;
        } else {
            perf.avgTickDurationNs = (perf.avgTickDurationNs * 7n + durationNs) / 8n;
        }
    }

    getPerformanceSnapshot() {
        return {
            tickRate: this.tickRate,
            tickDurationMs: this.tickDurationMs,
            lastTickMs: nsToMs(this.tickPerformance.lastTickDurationNs),
            avgTickMs: nsToMs(this.tickPerformance.avgTickDurationNs),
            maxTickMs: nsToMs(this.tickPerformance.maxTickDurationNs),
            lastFrameMs: nsToMs(this.tickPerformance.lastFrameTimeNs),
            backlogMs: nsToMs(this.accumulatorNs),
            overrunCount: this.tickPerformance.overrunCount,
            droppedTicks: this.tickPerformance.droppedTicks,
            totalTicks: this.tickPerformance.totalTicks
        };
    }

    executeOneTick() {
        if (this.isGameOver) return;

        try {
            this.handleInputs();
            this.tickGameObjects();

            if (this.checkWinCondition()) {
                this.isGameOver = true;
                this.stopLoop();
                this.sendBattleEnd();
                return;
            }

            this.tickCount++;
            this.sendVisionUpdates();

            if (this.debugLoggingEnabled && this.tickCount > 0 && this.tickCount % this.performanceLogIntervalTicks === 0) {
                const perf = this.getPerformanceSnapshot();
                console.log(
                    `[Battle] Tick ${this.tickCount} | last=${perf.lastTickMs.toFixed(3)}ms avg=${perf.avgTickMs.toFixed(3)}ms ` +
                    `max=${perf.maxTickMs.toFixed(3)}ms backlog=${perf.backlogMs.toFixed(3)}ms dropped=${perf.droppedTicks}`
                );
            }
        } catch (e) {
            console.error(`[BattleMode] Tick error: ${e.message}`, e.stack);
            this.isGameOver = true;
            this.stopLoop();
        }
    }

    handleInputs() {
        for (const p of this.players) {
            const inputQueue = p.inputQueue;
            const inputCount = inputQueue.length;

            for (let inputIndex = 0; inputIndex < inputCount; inputIndex++) {
                const input = inputQueue[inputIndex];

                if (p.player.lastHandledInput !== undefined && input.index <= p.player.lastHandledInput) {
                    continue;
                }
                p.player.lastHandledInput = input.index;

                if (input.type === 2) {
                    p.player.targetX = input.x;
                    p.player.targetY = input.y;
                } else if (input.type === 0) {
                    let angle;
                    let targetX, targetY;

                    const bdata = p.player.attackData;
                    const projInfo = bdata && global.projDataById && global.projDataById[bdata.projectileId];
                    const isIndirect = projInfo && projInfo.indirect;

                    if (input.autoAim || isIndirect) {
                        const dx = input.x - p.player.x;
                        const dy = input.y - p.player.y;
                        let angleInDegrees = Math.atan2(dy, dx) * 180 / Math.PI;
                        if (angleInDegrees < 0) angleInDegrees += 360;
                        angle = Math.floor(angleInDegrees);
                        targetX = input.x;
                        targetY = input.y;
                    } else {
                        let angleInDegrees = Math.atan2(input.y, input.x) * 180 / Math.PI;
                        if (angleInDegrees < 0) angleInDegrees += 360;
                        angle = Math.floor(angleInDegrees);
                        targetX = p.player.x + input.x;
                        targetY = p.player.y + input.y;
                    }

                    p.player.angle = angle;

                    if (p.player.character) {
                        p.player.character.attack(this, angle, targetX, targetY);
                    }
                } else if (input.type === 9) {
                    // Emote
                    p.player.usePin = true;
                    p.player.pinId = input.pinId;
                    p.player.pinTick = this.tickCount;
                }
            }

            if (inputCount > 0) {
                inputQueue.length = 0;
            }
        }
    }

    tickGameObjects() {
        for (const p of this.players) {
            if (p.player.character) p.player.character.tick(this);
            const player = p.player;

            // Tick poison
            if (player.poison) {
                if (player.poison.tick(player)) {
                    player.poison = null; // Poison expired
                }
            }

            if (player.targetX !== undefined && player.targetY !== undefined) {
                const speed = (player.speed || 720) / 20; 
                let isMoving = false;

                if (player.targetX !== player.x) {
                    if (player.targetX > player.x) {
                        player.x += Math.min(speed, player.targetX - player.x);
                    } else {
                        player.x -= Math.min(speed, player.x - player.targetX);
                    }
                    isMoving = true;
                }

                if (player.targetY !== player.y) {
                    if (player.targetY > player.y) {
                        player.y += Math.min(speed, player.targetY - player.y);
                    } else {
                        player.y -= Math.min(speed, player.y - player.targetY);
                    }
                    isMoving = true;
                }

                if (isMoving) {
                    const dx = player.targetX - player.x;
                    const dy = player.targetY - player.y;
                    let angleInDegrees = Math.atan2(dy, dx) * 180 / Math.PI;
                    if (angleInDegrees < 0) angleInDegrees += 360;
                    player.angle = Math.floor(angleInDegrees);
                }

                if (!isMoving) {
                    player.targetX = undefined;
                    player.targetY = undefined;
                }
            }
        }

        const gameObjects = this.gameObjects;
        for (let i = 0; i < gameObjects.length; i++) {
            const obj = gameObjects[i];
            if (typeof obj.tick === 'function') obj.tick(this);
        }

        let writeIndex = 0;
        for (let i = 0; i < gameObjects.length; i++) {
            const obj = gameObjects[i];
            if (!obj.isRemoved) {
                gameObjects[writeIndex++] = obj;
            } else {}
        }
        if (gameObjects.length !== writeIndex) {
            gameObjects.length = writeIndex;
        }
    }

    checkWinCondition() {
        return this.tickCount > 10000; 
    }

    getOrCreateSendContext(playerSession) {
        if (!playerSession._visionSendContext) {
            const udpHeader = Buffer.allocUnsafe(10);
            udpHeader.writeBigInt64BE(BigInt(playerSession.sessionId), 0);
            udpHeader.writeUInt16BE(0, 8);

            playerSession._visionSendContext = {
                udpHeader,
                stateBitStream: new BitStream(INITIAL_VISION_BUFFER_BYTES),
                message: new VisionUpdateMessage(
                    playerSession.tcpClient,
                    playerSession.player,
                    0,
                    0,
                    this.tickCount,
                    0,
                    Buffer.alloc(0)
                ),
                packetStream: new ByteStream(INITIAL_PACKET_BUFFER_BYTES)
            };
        }

        return playerSession._visionSendContext;
    }

    sendVisionUpdates() {
        const players = this.players;
        const viewerCount = players.length;

        if (viewerCount === 0 || !global.udpGateway) {
            return;
        }

        for (let i = 0; i < viewerCount; i++) {
            const playerSession = players[i];
            const sendContext = this.getOrCreateSendContext(playerSession);

            const bit = sendContext.stateBitStream.reset();
            this.encodeGameState(bit, i);
            const stateBuffer = bit.buffer.subarray(0, bit.offset);

            const message = sendContext.message;
            message.client = playerSession.tcpClient;
            message.player = playerSession.player;
            message.tick = this.tickCount;
            message.lastHandledInput = playerSession.player.lastHandledInput || 0;
            message.viewersCount = this.tickCount;
            message.visionBitStreamLength = stateBuffer.length;
            message.visionBuffer = stateBuffer;
            message.encode();

            const packetStream = sendContext.packetStream.reset();
            packetStream.appendBuffer(sendContext.udpHeader);
            packetStream.writeVInt(24109);
            packetStream.writeVInt(message.offset);
            packetStream.appendBuffer(message.toBuffer());

            const finalUdpPacket = Buffer.allocUnsafe(packetStream.offset);
            packetStream.buffer.copy(finalUdpPacket, 0, 0, packetStream.offset);

            global.udpGateway.sendTo(playerSession, finalUdpPacket);
        }
    }

    encodeGameState(bit, playerIndex) {
        const p = this.players[playerIndex].player;
        const selfObjectIdx = p.objectIdx;

        bit.writePositiveInt(1000000 + playerIndex, 21); // LogicPlayer Account Id
        bit.writePositiveInt(0, 1);
        bit.writeInt(-1, 4); // round state -1
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(1, 1);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 1);

        bit.writePositiveInt(0, 6);
        bit.writePositiveInt(0, 6);
        bit.writePositiveInt(0, 6);
        bit.writePositiveInt(0, 6);

        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(1, 1);
        bit.writePositiveInt(1, 1);
        bit.writePositiveInt(1, 1);

        for (let i = 0; i < this.players.length; i++) {
            const targetP = this.players[i].player;
            bit.writeBoolean(true); // Player exists
            bit.writePositiveInt(3, 4); // Team
            bit.writePositiveInt(0, 1); // Has Display Data change

            if (i === playerIndex) {
                const hasPin = targetP.usePin && (this.tickCount - targetP.pinTick) < 100;
                bit.writeBoolean(hasPin);
                if (hasPin) {
                    bit.writeInt(targetP.pinId, 3);
                    bit.writePositiveInt(this.tickCount, 14);
                }
                bit.writePositiveInt(4000, 12); // Ulti points
                bit.writePositiveInt(0, 1); // Has gadget
            }
            bit.writePositiveInt(0, 1);
            bit.writePositiveInt(1, 1);
        }

        bit.writePositiveInt(this.players.length, 4); // players left!
        for (let i = 0; i < this.players.length; i++) {
            bit.writePositiveInt(0, 1);
            bit.writePositiveInt(0, 1);
        }

        bit.writePositiveInt(this.gameObjects.length, 8); // GameObjects Count

        for (const obj of this.gameObjects) {
            bit.writePositiveInt(obj.classId || 16, 5);
            bit.writePositiveInt(obj.instanceId || (obj.battleBrawlerId || 0), 9);
        }

        for (const obj of this.gameObjects) {
            bit.writePositiveInt(obj.objectIdx, 14);
        }

        for (const obj of this.gameObjects) {
            const isSelf = obj.objectIdx === selfObjectIdx;

            if (typeof obj.encode === 'function' && (obj.classId === 6 || obj.classId === 17 || obj.classId === 18 || (obj.classId === 16 && obj.instanceId === 51))) {
                obj.encode(bit);
            } else if (obj.classId === 16) {
                const isOtherPlayer = !isSelf && obj.classId === 16 && (obj.instanceId < 50);
                const payloadIdx = isOtherPlayer ? (16 + obj.objectIdx) : obj.objectIdx;

                // LogicGameObjectServer.Encode
                bit.writePositiveVInt(obj.x, 4);
                bit.writePositiveVInt(obj.y, 4);
                bit.writePositiveVInt(payloadIdx, 3);
                bit.writePositiveVInt(obj.z || 0, 4);

                // LogicCharacterServer.Encode
                bit.writePositiveInt(10, 4); // Visibility

                if (isSelf) {
                    bit.writePositiveInt(0, 1);
                    bit.writePositiveInt(0, 1);
                } else {
                    bit.writePositiveInt(obj.angle || 0, 9);
                    bit.writePositiveInt(obj.angle || 0, 9);
                }

                bit.writePositiveInt(0, 3); // AttackState
                bit.writePositiveInt(0, 1); // Rage
                bit.writeInt(63, 6);

                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(1, 1);
                bit.writePositiveInt(1, 1);

                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(0, 2);

                bit.writePositiveVInt(obj.hp || 3200, 4); // left health
                bit.writePositiveVInt(obj.maxHp || 5000, 4); // Health
                bit.writePositiveVIntMax255OftenZero(0); // Collected items, Gems, Cubes but game freaks out
                //console.log("Power Cubes: ", obj.powerCubes)
                //bit.writePositiveVIntMax255OftenZero(0);

                bit.writePositiveInt(1, 1); 
                bit.writePositiveInt(0, 1); 

                const isCharging = obj.isCharging || false;
                bit.writeBoolean(isCharging);
                if (isCharging) {
                    bit.writeBoolean(true);
                    bit.writeBoolean(false); // shield
                    bit.writePositiveInt(0, 1); // stun?
                    bit.writePositiveInt(0, 1); // red
                    bit.writePositiveInt(0, 1); 
                    bit.writePositiveInt(0, 1); // aiming ulti
                    bit.writePositiveInt(0, 1); // yellow shield
                    bit.writePositiveInt(0, 1);
                }


                if (isSelf) {
                    bit.writePositiveInt(0, 1);
                }

                if (obj.instanceId === 22) bit.writePositiveInt(0, 1);
                if (obj.instanceId === 29) bit.writePositiveInt(0, 2);
                if (obj.instanceId === 38) bit.writePositiveInt(0, 2);

                if (isSelf) {
                    bit.writePositiveInt(0, 4);
                }




                bit.writePositiveInt(0, 2);
                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(1, 9);

                if (isSelf) {
                    bit.writePositiveInt(0, 1);
                    bit.writePositiveInt(0, 1);
                }

                bit.writePositiveInt(0, 5); 

                // LogicSkillServer.Encode
                bit.writePositiveVIntMax255OftenZero(obj.character?.ticksActive || 0); // Activated
                bit.writeBoolean(false); // SkillCanChange (Boolean)
                bit.writePositiveVIntMax255OftenZero(0); // State
                if (true) { 
                    bit.writePositiveInt(Math.floor(obj.character?.ammo || 0), 12); // Charge
                }
                bit.writePositiveInt(1, 1);
                bit.writePositiveInt(0, 1);
                bit.writePositiveInt(1, 1);
            }
        }
    }

    forceEnd() {
        this.isGameOver = true;
        this.stopLoop();
    }

    sendBattleEnd() {
        console.log(`[BattleMode] Battle Ended!`);
    }
}

module.exports = BattleMode;
