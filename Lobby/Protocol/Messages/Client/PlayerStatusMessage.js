const PiranhaMessage = require('../../PiranhaMessage')
const ServerHelloMessage = require('../Server/ServerHelloMessage')

class PlayerStatusMessage extends PiranhaMessage {
  constructor(bytes, client, player, db) {
    super(bytes)
    this.client = client
    this.player = player
    this.id = 14366
    this.version = 0
  }

  async decode() {
    // this.readInt()
  }

  async process() {
  }
}

module.exports = PlayerStatusMessage
