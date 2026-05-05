console.log(
  " ____        _   _   _      ____                             \n" +
  "| __ )  __ _| |_| |_| | ___/ ___|  ___ _ ____   _____ _ __   \n" +
  "|  _ \\ / _` | __| __| |/ _ \\___ \\ / _ \\ '__\\ \\ / / _ \\ '__|  \n" +
  "| |_) | (_| | |_| |_| |  __/___) |  __/ |   \\ V /  __/ |     \n" +
  "|____/ \\__,_|\\__|\\__|_|\\___||____/ \\___|_|    \\_/ \\___|_|     \n" +
  "\n[BATTLE SERVER] >> Server started!"
);

const dgram = require('dgram');
const http = require('http');
const url = require('url');
global.config = require('./config.js');

const UdpGateway = require('./Networking/UdpGateway');
const BattleMode = require('./Logic/Instances/BattleMode');


class BattleServer {
  constructor() {
    this.activeBattles = new Map(); // battleId -> BattleMode
    this.battleIdCounter = 1;
    this.sessionIdCounter = 2000; // room id
    this.sessionIdToBattle = new Map(); // sessionId -> battleId 
    this.udpGateway = null;
    this.httpServer = null;
    this.isShuttingDown = false;
    this.statsReportInterval = null;
  }

  async start() {
    try {
      console.log('[Battle] Starting the server...');


      console.log('[Battle] CSV Data loading...');
      const csvReader = require('./CSVReader/reader');
      const reader = new csvReader();
      await reader.init();
      console.log('[BattleServer] CSV Data loaded successfully!');

      this.udpGateway = new UdpGateway(global.config.udp.port, this);
      global.udpGateway = this.udpGateway; 
      console.log(`[BattleServer] UDP Gateway listening on port ${global.config.udp.port}`);

      this.startHttpServer();

      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

      console.log('[Battle] >> Battle server is ready to go!');
    } catch (err) {
      console.error('[FATAL] Battle Server failed to start:', err.message);
      process.exit(1);
    }
  }

  startHttpServer() {
    const httpPort = global.config.http.port;
    this.httpServer = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');

      try {
        if (req.method === 'POST' && pathname === '/battle/start') {
          this.handleBattleStart(req, res);
        } else if (req.method === 'GET' && pathname === '/stats') {
          this.handleStatsRequest(res);
        } else if (req.method === 'POST' && pathname === '/battle/end') {
          this.handleBattleEnd(req, res);
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (err) {
        console.error('[HTTP] Error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    });

    this.httpServer.listen(httpPort, () => {
      console.log(`[Battle] HTTP API listening on port ${httpPort}`);
    });

    this.httpServer.on('error', (err) => {
      console.error('[HTTP] Server error:', err);
    });
  }

  handleBattleStart(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const battleData = JSON.parse(body);
        const battleId = battleData.battleId || `battle-${this.battleIdCounter++}`;
        const locationId = battleData.locationId !== undefined ? battleData.locationId : 14;

        const battle = new BattleMode(locationId);
        battle.id = battleId;
        battle.playerData = [];

        const sessionIds = [];
        if (battleData.players && battleData.players.length > 0) {
          for (const playerData of battleData.players) {
            const sessionId = this.sessionIdCounter++;
            sessionIds.push(sessionId);

            this.sessionIdToBattle.set(sessionId, battleId);

            battle.playerData.push({
              sessionId: sessionId,
              username: playerData.username,
              high_id: playerData.high_id,
              low_id: playerData.low_id,
              battleBrawlerId: playerData.battleBrawlerId,
              battleOwnIndex: playerData.battleOwnIndex || 0,
              battleTeamIndex: playerData.battleTeamIndex || 0,
              thumbnail: playerData.thumbnail || 0,
              name_color: playerData.name_color || 0,
              selectedSkin: playerData.selectedSkin || 0
            });

            console.log(`[BattleServer] Reserved session ${sessionId} for player ${playerData.username} in battle ${battleId}`);
          }
        }

        this.activeBattles.set(battleId, battle);
        console.log(`[BattleServer] Battle ${battleId} created and waiting for ${sessionIds.length} players to connect via UDP`);

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          battleId: battleId,
          sessionId: sessionIds[0], 
          sessionIds: sessionIds, 
          battleLocationId: locationId
        }));
      } catch (err) {
        console.error('[Battle] Error while starting battle:', err);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid battle data', details: err.message }));
      }
    });
  }

  handleStatsRequest(res) {
    let trackedBattles = 0;
    let totalAvgTickMs = 0;
    let maxTickMs = 0;
    let totalOverrunCount = 0;
    let totalDroppedTicks = 0;

    for (const battle of this.activeBattles.values()) {
      if (typeof battle.getPerformanceSnapshot !== 'function') {
        continue;
      }

      const perf = battle.getPerformanceSnapshot();
      trackedBattles += 1;
      totalAvgTickMs += perf.avgTickMs;
      maxTickMs = Math.max(maxTickMs, perf.maxTickMs);
      totalOverrunCount += perf.overrunCount;
      totalDroppedTicks += perf.droppedTicks;
    }

    const stats = {
      battleServerId: global.config.battle.id,
      activeBattles: this.activeBattles.size,
      activeSessions: this.udpGateway?.activeSessions?.size || 0,
      uptime: process.uptime(),
      timestamp: Date.now(),
      tickMetrics: trackedBattles > 0 ? {
        trackedBattles,
        targetTickRate: global.config.battle.tickRate,
        averageTickMs: Number((totalAvgTickMs / trackedBattles).toFixed(3)),
        maxTickMs: Number(maxTickMs.toFixed(3)),
        totalOverrunCount,
        totalDroppedTicks
      } : null
    };

    res.writeHead(200);
    res.end(JSON.stringify(stats));
  }

  handleBattleEnd(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { battleId } = JSON.parse(body);
        const battle = this.activeBattles.get(battleId);
        if (battle) {
          battle.forceEnd();
          this.activeBattles.delete(battleId);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: `Battle ${battleId} ended` }));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Battle not found' }));
        }
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  }


  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('[Battle] shutting down bye bye...');

    clearInterval(this.statsReportInterval);

    for (const [battleId, battle] of this.activeBattles) {
      battle.forceEnd();
      console.log(`[Battle] Battle ended, but why? ${battleId}`);
    }

    if (this.udpGateway) {
      this.udpGateway.shutdown();
    }

    if (this.httpServer) {
      this.httpServer.close();
    }

    console.log('[BattleServer] >> Shutdown complete');
    process.exit(0);
  }
}

const battleServer = new BattleServer();
battleServer.start().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});

module.exports = BattleServer;
