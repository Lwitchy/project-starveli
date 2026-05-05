const PiranhaMessage = require('../../PiranhaMessage')
const LogicChangeAvatarNameCommand = require('../../Commands/Server/LogicChangeAvatarNameCommand')
const LogicGiveDeliveryCommand = require('../../Commands/Server/LogicGiveDeliveryCommand')
const LogicDayChangedCommand = require('../../Commands/Server/LogicDayChangedCommand')
const LogicOffersChangedCommand = require('../../Commands/Server/LogicOffersChangedCommand')
const LogicAddNotificationCommand = require('../../Commands/Server/LogicAddNotificationCommand')

class AvailableServerCommandMessage extends PiranhaMessage {
    constructor(client, player, commandID, db, extraData = null) {
        super()
        this.id = 24111
        this.client = client
        this.player = player
        this.db = db
        this.commandID = commandID
        this.extraData = extraData
    }

    async encode() {
        // map of command ids to their handler classes
        let cmdMap = {
            201: LogicChangeAvatarNameCommand,
            203: LogicGiveDeliveryCommand,
            204: LogicDayChangedCommand,
            211: LogicOffersChangedCommand,
            206: LogicAddNotificationCommand
        }

        if (this.commandID in cmdMap) {
            this.writeVInt(this.commandID)
            await new cmdMap[this.commandID]().encode(this)
        }
    }

    // override send so we can await encode (needed because LogicGiveDelivery does async db stuff)
    // ik it's stupid way to update all db queries and not health for prod usage but the question is
    // who cares? 
    async send() {
        if (this.id < 20000) return

        await this.encode()
        let encryptedbuffer = this.client.crypto.encrypt(this.id, this.buffer)
        let header = this.writeHeader(this.id, encryptedbuffer.length, this.version)
        this.client.write(Buffer.concat([header, encryptedbuffer]))
        this.client.log(`Packet ${this.id} (${this.constructor.name}) was sent.`)
    }
}

module.exports = AvailableServerCommandMessage
