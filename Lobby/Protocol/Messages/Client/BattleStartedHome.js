const PiranhaMessage = require('../../PiranhaMessage')
const ServerHelloMessage = require('../Server/ServerHelloMessage')

class BattleStartedHome extends PiranhaMessage {
    constructor(bytes, client, player, db) {
        super(bytes)
        this.client = client
        this.player = player
        this.id = 10211
        this.version = 0
        this.bytes = bytes
    }

    async decode() {
        try {
            this.payload = this.bytes.readUInt32BE(0);
            console.log(this.payload);
        } catch (error) {
            console.log(error);
        }
    }

    async process() {
    }
}

module.exports = BattleStartedHome
