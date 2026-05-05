const PiranhaMessage = require('../../PiranhaMessage');


class ClientCapabilities extends PiranhaMessage {
    constructor(payload, client, player) {
        super(payload)
        this.id = 10177;
        this.version = 0;
        this.client = client;
        this.player = player;
    }

    decode() {
        this.player.latency = this.readVInt()
    }

    process() {
        //this.client.log("LATENCY: " + this.player.latency);
    }
}
module.exports = ClientCapabilities;