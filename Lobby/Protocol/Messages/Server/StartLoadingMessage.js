const PiranhaMessage = require('../../PiranhaMessage')

class StartLoadingMessage extends PiranhaMessage {
    constructor(client, player, playersList = [], map) {
        super()
        this.id = 20559
        this.version = 0
        this.client = client
        this.player = player
        this.playersList = playersList
        this.mapId = map
        this.mapIdString = "";
    }


    async encode() {
        this.writeInt(this.playersList.length);
        this.writeInt(0);
        this.writeInt(0); // Side


        this.writeInt(this.playersList.length);

        for (const p of this.playersList) {
            this.writeLong(p.high_id, p.low_id);

            this.writeVInt(p.battleOwnIndex || 0); // Player Index
            this.writeVInt(0);
            this.writeVInt(0); 
            this.writeInt(0); 

            this.writeDataReference(16, p.battleBrawlerId || 0); // Player Brawler
            this.writeVInt(0);// skin 

            console.log(`Player ${p.username} selected Brawler ID ${p.battleBrawlerId} with Skin ID ${p.selectedSkin}`);

            this.writeBoolean(false); 

            this.writeString(p.username || "");
            this.writeVInt(100); // exp
            this.writeVInt(28000000 + (p.thumbnail || 0)); // iconn
            this.writeVInt(43000000 + (p.name_color || 0)); // color 
            this.writeVInt(-1); 

            this.writeBoolean(false);
        }

        this.writeInt(0); // Array
        this.writeInt(0);
        this.writeInt(0);

        this.writeVInt(6); // GameMode 
        this.writeVInt(1); // DrawMap
        this.writeVInt(1);

        this.writeBoolean(true);

        this.writeVInt(0); // Spectate mode
        this.writeVInt(0);

        this.writeDataReference(15, this.mapId); // Location ID

        this.writeBoolean(false);

        this.writeVInt(0);
        this.writeVInt(0);
        this.writeVInt(0);
    }
}

module.exports = StartLoadingMessage
