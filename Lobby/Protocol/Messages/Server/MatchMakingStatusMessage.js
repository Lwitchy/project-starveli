const PiranhaMessage = require('../../PiranhaMessage')

class MatchMakingStatusMessage extends PiranhaMessage {
  constructor(client, player) {
    super()
    this.id = 20405
    this.version = 0
    this.client = client
    this.player = player
  }

  async encode() {
    this.writeInt(4); // mmTimer
    this.writeInt(1); // PlayersFound
    this.writeInt(2); // MaxPlayers

    this.writeInt(0);
    this.writeInt(0);

    this.writeBoolean(true); // show timer
  }
}

module.exports = MatchMakingStatusMessage
