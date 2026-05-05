class LogicSelectBrawlerCommand {
    decode(self) {
        self.readVInt()
        self.readVInt()
        self.readVInt()
        self.readVInt()
        this.brawlerID = self.readDataReference()
    }

    async process(self) {
        console.log("Select brawler", this.brawlerID)
        if (this.brawlerID && this.brawlerID[0] === 16) {
            self.player.home_brawler = this.brawlerID[1];
            await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'home_brawler', self.player.home_brawler);
        }
    }
}

module.exports = LogicSelectBrawlerCommand;
