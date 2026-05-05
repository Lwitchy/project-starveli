const OwnHomeDataMessage = require('../../Messages/Server/OwnHomeDataMessage')

// sent to client when shop refreshes
class LogicOffersChangedCommand {
    encode(self) {
        new OwnHomeDataMessage().LogicShopData(self)
    }
}

module.exports = LogicOffersChangedCommand
