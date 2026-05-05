// tailsjs
class MessagesHandler {
    constructor(client, packets) {
        this.client = client
        this.packets = packets
    }
    async handle(id, bytes, player, database, crypto) {

        if (this.isPacketExists(id.toString())) {
            try {
                const PacketHandler = this.getPacketHandler(id)
                const packet = new PacketHandler(bytes, this.client, this.client.player, this.client.database)
                this.client.log(`Gotcha ${id} (${packet.constructor.name}) packet!`)
                await packet.decode()
                await packet.process()
            } catch (e) {
                console.log(e)
            }
        } else {
            this.client.log(`Gotcha undefined ${id} packet!`)
        }
    }

    isPacketExists(id) {
        return Object.keys(this.packets).includes(id)
    }

    getPacketHandler(id) {
        return this.packets[id]
    }
}

module.exports = MessagesHandler