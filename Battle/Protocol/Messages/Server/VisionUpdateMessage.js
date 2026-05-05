const PiranhaMessage = require('../../PiranhaMessage')

class VisionUpdateMessage extends PiranhaMessage {
  constructor(client, player, tick, lastHandledInput, viewersCount, visionBitStreamLength, visionBuffer) {
    super(Math.max(64, 32 + (visionBitStreamLength || 0)))
    this.id = 24109
    this.version = 0
    this.client = client
    this.player = player
    this.tick = tick
    this.lastHandledInput = lastHandledInput
    this.viewersCount = viewersCount
    this.visionBitStreamLength = visionBitStreamLength
    this.visionBuffer = visionBuffer
  }

  encode() {
    this.reset()
    this.writeVInt(this.tick);
    this.writeVInt(this.lastHandledInput || 0);
    this.writeVInt(0);
    this.writeVInt(this.viewersCount);
    this.writeBoolean(false);

    this.writeInt(this.visionBitStreamLength);
    if (this.visionBitStreamLength > 0) {
      this.appendBuffer(this.visionBuffer.subarray(0, this.visionBitStreamLength));
    }
  }
}

module.exports = VisionUpdateMessage
module.exports = VisionUpdateMessage
