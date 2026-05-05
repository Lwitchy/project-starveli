const dgram = require('dgram');
const ByteStream = require('../ByteStream');
const ClientInputMessage = require('../Protocol/Messages/Client/ClientInputMessage');

class UdpGateway {
    constructor(port, battleServer = null) {
        this.port = port;
        this.battleServer = battleServer; 
        this.socket = dgram.createSocket('udp4');
        this.activeSessions = new Map(); // SessionId -> client object
        this.debugLoggingEnabled = global.config?.logging?.level === 'debug';

        this.socket.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
        this.socket.on('listening', () => {
            console.log(`[UDP Gateway] >> Listening on port ${this.port}`);
        });
        this.socket.on('error', (err) => {
            console.error('[UDP Gateway] >> Error:', err);
        });

        this.socket.bind(port);
    }

    createSession(player, tcpClient) {
        if (!global.nextUdpSessionId) global.nextUdpSessionId = 1001;
        const sessionId = (global.nextUdpSessionId++).toString();

        const udpClient = {
            sessionId: sessionId,
            player: player,
            tcpClient: tcpClient,
            battle: null,
            rinfo: null, 
            handleMessage: (type, payload) => this.handleClientMessage(udpClient, type, payload)
        };

        this.activeSessions.set(sessionId, udpClient);
        return udpClient;
    }

    onMessage(msg, rinfo) {
        try {
            if (msg.length < 10) return;

            const sessionId = Number(msg.readBigInt64BE(0));
            let client = this.activeSessions.get(sessionId);

            if (!client && this.battleServer) {
                const battleId = this.battleServer.sessionIdToBattle.get(sessionId);
                if (battleId) {
                    const battle = this.battleServer.activeBattles.get(battleId);
                    if (battle && battle.playerData) {
                        const playerData = battle.playerData.find(p => p.sessionId === sessionId);
                        if (playerData) {
                            client = {
                                sessionId: sessionId,
                                player: {
                                    username: playerData.username,
                                    high_id: playerData.high_id,
                                    low_id: playerData.low_id,
                                    battleBrawlerId: playerData.battleBrawlerId
                                },
                                battle: battle,
                                rinfo: rinfo,
                                handleMessage: (type, payload) => this.handleClientMessage(client, type, payload)
                            };
                            this.activeSessions.set(sessionId, client);
                            console.log(`[UDP Gateway] Player ${playerData.username} connected to UDP with sessionId ${sessionId}`);

                            battle.addPlayer(client);
                            console.log(`[UDP Gateway] Added player to battle ${battleId}. Now has ${battle.players ? battle.players.length : 0} players`);

                            if (!battle.isStarted && !battle.startScheduled) {
                                battle.startScheduled = true;
                                setTimeout(() => {
                                    if (this.debugLoggingEnabled) {
                                        console.log(`[UDP Gateway] Starting battle ${battleId} with ${battle.players.length} players`);
                                    }
                                    battle.start();
                                }, 1000);
                            }
                        }
                    }
                }
            }

            if (!client) {
                return;
            }

            if (!client.rinfo) {
                client.rinfo = rinfo;
                if (this.debugLoggingEnabled) {
                    console.log(`[UDP Gateway] Client ${client.player.username} bound to ${rinfo.address}:${rinfo.port}`);
                }
            }

            // Not the best way...
            const stream = new ByteStream(msg.subarray(10)); // Skip sessionid(8) + padding(2)

            const type = stream.readVInt();
            const length = stream.readVInt();
            const payload = msg.slice(10 + stream.offset, 10 + stream.offset + length);

            // console.log(`[UDP Gateway] Message Type: ${type}, Length: ${length}, Payload: ${payload.toString('hex')}`);

            client.handleMessage(type, payload);
        } catch (err) {
            console.error("[UDP Gateway] >> Packet Error:", err);
        }
    }

    handleClientMessage(client, type, payload) {
        if (type === 10555) {

            const stream = new ByteStream(payload);

            const inputMsg = new ClientInputMessage();
            inputMsg.buffer = stream.buffer;
            inputMsg.offset = stream.offset;
            inputMsg.decode();

            if (client.battle) {
                for (const input of inputMsg.inputs) {
                    client.battle.queueInput(client.sessionId, input);
                }
            }
        }
    }

    sendTo(client, buffer) {
        if (!client.rinfo) return;
        this.socket.send(buffer, 0, buffer.length, client.rinfo.port, client.rinfo.address);
    }

    closeSession(sessionId) {
        if (this.activeSessions.has(sessionId)) {
            this.activeSessions.delete(sessionId);
            console.log(`[UDP Gateway] Session ${sessionId} closed`);
        }
    }

    shutdown() {
        this.activeSessions.clear();
        this.socket.close(() => {
            console.log('[UDP Gateway] UDP socket closed');
        });
    }
}

module.exports = UdpGateway;
