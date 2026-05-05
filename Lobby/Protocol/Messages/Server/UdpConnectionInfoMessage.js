const PiranhaMessage = require('../../PiranhaMessage')

class UdpConnectionInfoMessage extends PiranhaMessage {
  constructor(client, player, udpSessionId) {
    super()
    this.id = 24112
    this.version = 0
    this.client = client
    this.player = player
    this.udpSessionId = udpSessionId;
  }

  async encode() {
    const udpPort = process.env.BATTLE_UDP_PORT || 9338; 
    const udpServer = process.env.BATTLE_SERVER_IP || "172.16.0.109"; 
    console.log(`[UdpConnectionInfoMessage] Sending to client: IP=${udpServer}, Port=${udpPort}, SessionId=${this.udpSessionId}`);
    this.writeVInt(udpPort); 
    this.writeString(udpServer);

    this.writeInt(10);

    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(this.udpSessionId));
    this.buffer = Buffer.concat([this.buffer, buf]);
    this.offset += 8;

    this.writeShort(0);

    this.writeInt(0);
  }
}

module.exports = UdpConnectionInfoMessage
