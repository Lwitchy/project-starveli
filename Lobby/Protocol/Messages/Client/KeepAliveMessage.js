const PiranhaMessage = require('../../PiranhaMessage')
const LobbyInfoMessage = require('../Server/LobbyInfoMessage')
const { rotateEvents, rotateShop, isEventRotationEnded } = require('../../../Logic/Rotation')
const AvailableServerCommandMessage = require('../Server/AvailableServerCommandMessage')

class KeepAliveMessage extends PiranhaMessage {
    constructor(payload, client, player, database) {
        super(payload)
        this.id = 10108
        this.version = 0
        this.client = client
        this.player = player
        this.db = database
    }

    decode() { }

    async process() {
        if (isEventRotationEnded()) {
            new AvailableServerCommandMessage(this.client, this.player, 204, this.db).send()
        }

        let didRotate = await rotateShop(this.player, this)
        if (didRotate) {
            this.db.updateAccountData(this.player.high_id, this.player.low_id, '', 'offers', this.player.offers).catch(e => { })
            this.db.updateAccountData(this.player.high_id, this.player.low_id, '', 'last_shop_update', this.player.last_shop_update).catch(e => { })
            new AvailableServerCommandMessage(this.client, this.player, 211, this.db).send()
            console.log("DEBUG: Rotation done, shop!")
        }

    }
}

module.exports = KeepAliveMessage
