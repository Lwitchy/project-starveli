class LogicClearShopTickCommand {
    decode(self) {
        // Read the command data: 4 VInts
        this.field1 = self.readVInt();
        this.field2 = self.readVInt();
        this.field3 = self.readVInt();
        this.field4 = self.readVInt();
    }

    async process(self) {
        // Clear shop ticks - not important, do nothing
        console.log("Clear shop ticks command processed");
    }
}

module.exports = LogicClearShopTickCommand;