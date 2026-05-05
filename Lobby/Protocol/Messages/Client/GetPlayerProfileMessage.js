const PiranhaMessage = require('../../PiranhaMessage');
const PlayerProfileMessage = require('../Server/PlayerProfileMessage');


class GetPlayerProfileMessage extends PiranhaMessage {
    constructor(payload, client, player, database){
        super(payload)
        this.id = 14113;
        this.client = client;
        this.player = player;
        this.db = database;
    }

    decode(){
        this.high_id = this.readInt();
        this.low_id = this.readInt();
    }

    async process(){
        let playerData = null;
        if(this.high_id === this.player.high_id && this.low_id === this.player.low_id){
            new PlayerProfileMessage(this.client, this.player, this.high_id, this.low_id, playerData).send();
        }else{
            let playerData = await this.db.loadAccount(this.high_id, this.low_id);
            new PlayerProfileMessage(this.client, this.player, this.high_id, this.low_id, playerData).send();
        }
    }
}

module.exports = GetPlayerProfileMessage;