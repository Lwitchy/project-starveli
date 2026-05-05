const fs = require('fs')
const path = require("node:path")
const glob = require("glob")

const getDirectories = (src, callback) => glob(src + '\**\*', callback);

class MessageFactory {
  constructor (useLegacyPacketLoader) {
    this.packets = {}
    if (!useLegacyPacketLoader) { // Rewrited
      getDirectories(path.join(__dirname, "Messages", "Client"), (err, res) => {
        if (err) Err(err) // err
        const files = res.filter(e => e.endsWith(".js"))
        for (const file of files) {

          try{
            const Packet = require("./" + path.relative(__dirname, file).replace("\\", "/"))
            const packetClass = new Packet()

            this.packets[packetClass.id] = Packet
          }catch(err){
            console.log(`A wild error while initializing "${file.split("/").slice(-1)}" packet!`)
            console.log(err)
          }
        }
      });
    } else { 
      try {
        const files = fs.readdirSync(path.join(__dirname, "Messages", "Client"));
        files.forEach(e => {
          try{
            const Packet = require(`./Messages/Client/${e.replace('.js', '')}`)
            const packetClass = new Packet()

            this.packets[packetClass.id] = Packet
          }catch(err){
            console.log(`A wild error while initializing "${e.replace(".js", "")}" packet!`)
            console.log(err)
          }
        })
      } catch(err) {
        console.log('Failed to load packets directory:', err)
      }
    }
  }
  /**
   * Get all packets
   * @returns { Object } Packets object
   */
  getAllPackets () {
    return this.packets
  }
}

module.exports = MessageFactory