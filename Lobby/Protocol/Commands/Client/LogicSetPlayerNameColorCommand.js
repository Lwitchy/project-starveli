class LogicSetPlayerNameColorCommand {
    decode(self){
        {
            // LogicCommand::decode
            self.readVInt()
            self.readVInt()
            self.readVInt()
            self.readVInt()
        }
        this.nameColor = self.readDataReference();
    }

    async process(self){
        //console.log("Name Color: ", this.nameColor);
        self.player.name_color = this.nameColor[1];
        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'name_color', this.nameColor[1]);
    }
}
module.exports = LogicSetPlayerNameColorCommand;