class LogicSetPlayerThumbnailCommand{
    decode(self){
        {
            // LogicCommand::decode
            self.readVInt()
            self.readVInt()
            self.readVInt()
            self.readVInt()
        }
        this.thumbnail = self.readDataReference() 
    }

    async process(self){
        self.player.thumbnail = this.thumbnail[1];
        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'thumbnail', self.player.thumbnail);
    }
}

module.exports = LogicSetPlayerThumbnailCommand;