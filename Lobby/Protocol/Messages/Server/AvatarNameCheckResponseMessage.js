const PiranhaMessage = require('../../PiranhaMessage');


class AvatarNameCheckResponseMessage extends PiranhaMessage{
    constructor(client, player){
        super()
        this.id = 20300;
        this.version = 0;
        this.client = client;
        this.player = player;
    }

    encode(){
        this.writeBoolean(false) // idkk
        this.writeInt(0) // Time
        this.writeString("lwitchy")
    }
}
module.exports = AvatarNameCheckResponseMessage;