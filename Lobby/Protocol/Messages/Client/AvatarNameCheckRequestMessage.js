const PiranhaMessage = require('../../PiranhaMessage');
const AvatarNameCheckResponseMessage = require('../Server/AvatarNameCheckResponseMessage');


class AvatarNameCheckRequestMessage extends PiranhaMessage{
    constructor(payload, client, player, database){
        super(payload)
        this.id = 14600;
        this.version = 0;
        this.client = client;
        this.player = player;
        this.db = database;
    }

    decode(){
        this.playerName = this.readString();
    }

    process(){
        new AvatarNameCheckResponseMessage(this.client, this.player).send();
    }
}
module.exports = AvatarNameCheckRequestMessage;