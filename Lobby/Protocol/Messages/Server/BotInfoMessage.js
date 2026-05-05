const PiranhaMessage = require('../../PiranhaMessage')

class BotInfoMessage extends PiranhaMessage {
    constructor(client, player) {
        super();
        this.id = 29999; // 🦅
        this.version = 29;
        this.client = client;
        this.player = player;
    }

    encode() {
    }

}

module.exports = BotInfoMessage;