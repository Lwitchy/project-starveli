const OwnHomeDataMessage = require('../../Messages/Server/OwnHomeDataMessage')

class LogicDayChangedCommand {
    encode(self) {
        // new day
        self.writeVInt(1) // not sure what this is, leaving it as 1
        new OwnHomeDataMessage().LogicConfData(self)
    }
}

module.exports = LogicDayChangedCommand
