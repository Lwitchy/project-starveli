const PiranhaMessage = require('../../PiranhaMessage');


class LoginFailedMessage extends PiranhaMessage{
    constructor(client, player, payload){
        super()
        this.id = 20103;
        this.version = 0;
        this.client = client;
        this.player = player;
        this.payload = payload;
    }

    encode(){

        this.writeInt(this.payload.code) // Error code
        this.writeString('') // Fingerprint
        this.writeString('') // Server host

        this.writeString('') // Patch URL
        this.writeString('') // Update URL
        this.writeString(this.payload.error_msg) // Message

        this.writeInt(0) // Maintenance Time
        this.writeBoolean(false) // Show support page

        this.writeString('')
        this.writeString('')

        this.writeInt(0)
        this.writeInt(3)

        this.writeString('')
        this.writeString('')

        this.writeInt(0)
        this.writeInt(0)

        this.writeBoolean(false)
        this.writeBoolean(false)
    }
}
module.exports = LoginFailedMessage;