const PiranhaMessage = require('../../PiranhaMessage')
const ServerHelloMessage = require('../Server/ServerHelloMessage')

class ClientHelloMessage extends PiranhaMessage {
  constructor(bytes, client, player, db) {
    super(bytes)
    this.client = client
    this.player = player
    this.id = 10100
    this.version = 0
  }

  async decode() {
    // this.readInt()
  }

  async process() {
    //this.client.crypto.test()
    await new ServerHelloMessage(this.client).send()
  }
}

module.exports = ClientHelloMessage
