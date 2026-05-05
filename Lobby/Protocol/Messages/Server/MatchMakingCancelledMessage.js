const PiranhaMessage = require('../../PiranhaMessage')

class MatchMakingCancelledMessage extends PiranhaMessage {
    constructor(client, player) {
        super()
        this.id = 20406
        this.version = 0
        this.client = client
        this.player = player
    }

    async encode() {

    }
}

module.exports = MatchMakingCancelledMessage
