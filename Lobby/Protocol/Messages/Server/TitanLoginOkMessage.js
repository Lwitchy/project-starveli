const PiranhaMessage = require('../../PiranhaMessage')

class TitanLoginOkMessage extends PiranhaMessage {
    constructor(client, player) {
        super();
        this.id = 20104;
        this.version = 27;
        this.client = client;
        this.player = player;
    }

    encode() {

        this.writeLong(this.player.high_id, this.player.low_id)
        this.writeLong(0, 0) // Will be used for Starveli ID


        this.writeString(this.player.token)
        this.writeString("") // can be used 
        this.writeString("") // can be used

        this.writeInt(29)
        this.writeInt(258)
        this.writeInt(1)

        this.writeString("dev|lwitchy,TEST,TEST0,TEST1,TEST2,TEST3") // can be used 

        this.writeInt(0)
        this.writeInt(0)
        this.writeInt(0)

        this.writeString("")
        this.writeString("")
        this.writeString("")

        this.writeInt(0)
        this.writeString("")
        this.writeString("AZ")
        this.writeString("")

        this.writeInt(2)

        this.writeString("")

        this.writeInt(2)
        this.writeString("")
        this.writeString("")

        this.writeInt(2)
        this.writeString("http://172.16.0.109:2000")
        this.writeString("")

        this.writeVInt(0)
        this.writeString("")


    }

}

module.exports = TitanLoginOkMessage;