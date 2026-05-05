const PiranhaMessage = require('../../PiranhaMessage')

class CreateAccountOkMessage extends PiranhaMessage {
    constructor(client, player) {
        super();
        this.id = 20101;
        this.version = 29;
        this.client = client;
        this.player = player;
    }

    encode() {
        this.writeString("blahblah")
        this.writeLong(0, 16)
    }
}

module.exports = CreateAccountOkMessage;