const LogicMath = require('../LogicMath');

class LogicGameObject {
    constructor(classId, instanceId) {
        this.classId = classId;
        this.instanceId = instanceId;
        this.x = 0;
        this.y = 0;
        this.z = 150;
        this.objectIdx = -1;
        this.isRemoved = false;
    }
    tick() { }
}

class LogicProjectile extends LogicGameObject {
    constructor(instanceId, owner, angle, damage, castingTime, targetX, targetY) {
        super(6, instanceId);
        this.owner = owner;
        this.ownerIdx = owner.objectIdx;
        this.angle = angle;
        this.damage = damage;
        this.castingTime = castingTime || 6;
        this.targetX = targetX !== undefined ? targetX : null;
        this.targetY = targetY !== undefined ? targetY : null;

        this.projData = (global.projDataById && global.projDataById[instanceId]) || {};
        this.speed = this.projData.speed || 3100;

        this.x = owner.x;
        this.y = owner.y;
        this.z = this.projData.indirect ? 0 : 400;

        this.ticksActive = 0;
        this.totalDelta = 0;
        this.shouldDestructImmediately = false;
        this.destroyedTicks = 0;
        this.alreadyDamagedIds = [];
        this.fullTravelTicks = -1;
    }

    _isDestroyed() {
        if (!this.projData.indirect && this.totalDelta > this.castingTime * 180) {
            return true;
        }
        return this.shouldDestructImmediately;
    }

    tick(battle) {
        if (this.isRemoved) return;

        if (this._isDestroyed()) {
            if (this.destroyedTicks < 1) {
                this._onDestroy(battle);
            }
            this.destroyedTicks++;
            if (this.destroyedTicks > 2) {
                this.isRemoved = true;
            }
            return;
        }

        const speed = this.speed;
        const speedPerTick = Math.floor(speed / 20);
        const substeps = 4;
        const speedPerSubstep = Math.floor(speedPerTick / substeps);

        const dirX = LogicMath.cos(this.angle);
        const dirY = LogicMath.sin(this.angle);

        if (!this.projData.indirect) {
            for (let s = 0; s < substeps; s++) {
                const moveX = Math.floor((dirX * speedPerSubstep) / 1024);
                const moveY = Math.floor((dirY * speedPerSubstep) / 1024);

                this.x += moveX;
                this.y += moveY;
                this.totalDelta += Math.sqrt(moveX * moveX + moveY * moveY);

                const LogicTileMap = require('./LogicTileMap');
                if (battle.tileMap && !this.projData.passEnvironment) {
                    const { tileX, tileY } = LogicTileMap.worldToTile(this.x, this.y);
                    if (battle.tileMap.destroysProjectile(tileX, tileY)) {
                        this.shouldDestructImmediately = true;
                        break;
                    }
                }

                if (battle.tileMap && !battle.tileMap.isInPlayArea(this.x, this.y)) {
                    this.shouldDestructImmediately = true;
                    break;
                }

                this._handleCollisions(battle);
                if (this.shouldDestructImmediately) break;
            }
        } else {
            if (this.fullTravelTicks < 0) {
                if (this.targetX !== null && this.targetY !== null) {
                    const dx = this.x - this.targetX;
                    const dy = this.y - this.targetY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    this.fullTravelTicks = speedPerTick > 0 ? Math.floor(distance / speedPerTick) : this.castingTime;
                    this.fullTravelTicks = Math.max(1, Math.min(this.fullTravelTicks, 60));
                } else {
                    this.fullTravelTicks = this.castingTime;
                }
            }

            const gravity = this.projData.gravity || 240;
            const gravityPerTick = Math.floor(gravity / 20);
            if (this.ticksActive < Math.floor(this.fullTravelTicks / 2)) {
                this.z += gravityPerTick * (this.fullTravelTicks - this.ticksActive);
            } else {
                const tmp = this.fullTravelTicks - this.ticksActive;
                const deltaZ = gravityPerTick * (this.ticksActive - tmp);
                if (deltaZ > 0) this.z -= deltaZ;
            }

            this.x += Math.floor((dirX * speedPerTick) / 1024);
            this.y += Math.floor((dirY * speedPerTick) / 1024);
            this.totalDelta += speedPerTick;

            if (this.ticksActive >= this.fullTravelTicks) {
                this.shouldDestructImmediately = true;
            }
        }

        this.ticksActive++;
    }

    _handleCollisions(battle) {
        if (!battle || !battle.gameObjects) return;
        const pierces = this.projData.piercesCharacters || false;

        for (const obj of battle.gameObjects) {
            if (obj === this.owner || obj.isRemoved) continue;
            if (this.alreadyDamagedIds.includes(obj.objectIdx)) continue;
            if (typeof obj.takeDamage !== 'function') continue;

            const dx = obj.x - this.x;
            const dy = obj.y - this.y;
            const distSq = dx * dx + dy * dy;
            const radius = (this.projData.radius || 100) + 100;

            if (distSq <= radius * radius) {
                obj.takeDamage(this.damage);
                this.alreadyDamagedIds.push(obj.objectIdx);

                if (this.projData.poisonType && typeof obj.addPoison === 'function') {
                    const poisonDmg = Math.floor((this.projData.poisonDamagePercent || 0) / 100 * this.damage);
                    obj.addPoison(this.owner, poisonDmg, 4, this.projData.poisonType);
                }

                if (!pierces) {
                    this.shouldDestructImmediately = true;
                    return;
                }
            }
        }
    }

    _onDestroy(battle) {
        const aeName = this.projData.spawnAreaEffectObject;
        if (aeName && global.areaEffectByName) {
            const aeData = global.areaEffectByName[aeName];
            if (aeData) {
                const LogicAreaEffect = require('./LogicAreaEffect');
                const ae = new LogicAreaEffect(aeData.instanceId, this.owner, this.damage);
                ae.x = this.x;
                ae.y = this.y;
                ae.objectIdx = battle.objectReferenceSeed++;
                battle.gameObjects.push(ae);
            }
        }
    }

    encode(bit) {
        bit.writePositiveVInt(this.x, 4);
        bit.writePositiveVInt(this.y, 4);
        bit.writePositiveVInt(this.ownerIdx, 3);
        bit.writePositiveVInt(this.z, 4);

        let effect = 0;
        if (!this.projData.indirect && this.totalDelta > this.castingTime * 180) effect = 1;
        if (this.shouldDestructImmediately) effect = 3;

        bit.writePositiveInt(effect, 3);
        bit.writeBoolean(false); 

        if (this.instanceId === 88) bit.writePositiveVInt(230, 4);
        bit.writePositiveInt(this.instanceId === 88 ? 329 : 0, 10);

        if (this.projData.rendering !== 'DoNotRotateClip') {
            bit.writePositiveInt(this.angle, 9);
        }
        bit.writePositiveInt(0, 1);
    }
}

module.exports = { LogicGameObject, LogicProjectile };
