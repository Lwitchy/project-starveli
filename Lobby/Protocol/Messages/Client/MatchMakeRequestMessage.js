const PiranhaMessage = require('../../PiranhaMessage')

class MatchMakeRequestMessage extends PiranhaMessage {
  constructor(bytes, client, player, database) {
    super(bytes)
    this.id = 14103
    this.version = 0
    this.client = client
    this.player = player
    this.database = database
  }

  async decode() {
    this.test = this.readVInt(); // Something
    this.selectedBrawler = this.readVInt();
    this.test2 = this.readVInt();
    this.evenSlot = this.readVInt();
    console.log(`[MatchMakeRequestMessage] Decoded: test=${this.test}, selectedBrawler=${this.selectedBrawler}, test2=${this.test2}, evenSlot=${this.evenSlot}`);
  }

  async process() {
    console.log(`[Matchmaking] Player ${this.player.username} started matchmaking with Brawler ID: ${this.selectedBrawler}`);
    console.log(`[Matchmaking] Selected event slot: ${this.evenSlot}`);

    this.player.battleBrawlerId = this.selectedBrawler;

    const MatchMakingStatusMessage = require('../Server/MatchMakingStatusMessage');
    const mms = new MatchMakingStatusMessage(this.client, this.player);
    mms.send();

    let participants = [];
    if (this.player.room) {
      participants = this.player.room.getMembers();
      console.log(`[Matchmaking] Room found. Starting battle for ${participants.length} players.`);
    } else {
       participants = global.clients.map(c => c.player).filter(p => p !== null);
      
      if (participants.length > 1) {
          console.log(`[Matchmaking] No room found.`);
      } else {
          participants = [this.player];
          console.log(`[Matchmaking] Single player matchmaking.`);
      }
    }

    participants.forEach(p => {
        if (!p.battleBrawlerId) p.battleBrawlerId = 0;
    });

    setTimeout(async () => {
      try {
        const slotData = require('../../../Data/Events');
        let locationId = 0; 
        
        const slot = slotData.find(s => s.slotID === this.evenSlot);
        if (slot && slot.slotMap !== undefined) {
          locationId = slot.slotMap;
          console.log(`[Matchmaking] Event Slot ${this.evenSlot} -> Map ID ${locationId}`);
        } else {
          console.warn(`[Matchmaking] Event slot ${this.evenSlot} not found, using fallback map 0`);
        }

        const http = require('http');
        
        const battleData = {
          battleId: `battle-${Date.now()}`,
          locationId: locationId, 
          players: participants.map((p, index) => ({
            battleOwnIndex: index, 
            battleTeamIndex: 0, 
            username: p.username,
            high_id: p.high_id,
            low_id: p.low_id,
            battleBrawlerId: p.battleBrawlerId || 0,
            selectedSkin: p.selectedSkins?.[p.battleBrawlerId] || 0,
            thumbnail: p.thumbnail || 0,
            name_color: p.name_color || 0
          }))
        };

        const battleServerPort = process.env.BATTLE_SERVER_HTTP_PORT || 9340;
        const options = {
          hostname: 'localhost',
          port: battleServerPort,
          path: '/battle/start',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.success) {
                console.log(`[Matchmaking] Battle created: ${response.battleId}`);
                
                const sessionIds = response.sessionIds || [response.sessionId];

                participants.forEach((p, idx) => {
                  if (p.client && !p.client.destroyed) {
                    const StartLoadingMessage = require('../Server/StartLoadingMessage');
                    const slm = new StartLoadingMessage(p.client, p, battleData.players, locationId);
                    slm.send();

                    const sessionId = sessionIds[idx] || sessionIds[0];
                    const UdpConnectionInfoMessage = require('../Server/UdpConnectionInfoMessage');
                    const uci = new UdpConnectionInfoMessage(p.client, p, sessionId);
                    uci.send();
                    
                    console.log(`[Matchmaking] Sent battle start messages to player: ${p.username}`);
                  }
                });

              } else {
                console.error('[Matchmaking] Battle server error:', response.error);
                this.client.errLog('Matchmaking failed: No battle server available');
              }
            } catch (err) {
              console.error('[Matchmaking] Error parsing response:', err);
            }
          });
        });

        req.on('error', (err) => {
          console.error('[Matchmaking] Battle server connection error:', err.message);
          this.client.errLog('Matchmaking failed: Cannot connect to battle server');
        });

        req.write(JSON.stringify(battleData));
        req.end();

      } catch (err) {
        console.error('[Matchmaking] Error:', err);
        this.client.errLog('Matchmaking failed: ' + err.message);
      }
    }, 2000);
  }
}

module.exports = MatchMakeRequestMessage
