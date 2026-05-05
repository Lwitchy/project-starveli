const PiranhaMessage = require('../../PiranhaMessage');

class LobbyInfoMessage extends PiranhaMessage {
    constructor(client, player) {
        super()
        this.id = 23457;
        this.version = 0;
        this.client = client;
        this.player = player;
    }

    encode() {
        this.writeVInt(global.connectionCount);
        this.writeString("Account create time: " + this.player.accountCreatedTime);
        this.writeVInt(0);
    }
}
module.exports = LobbyInfoMessage;