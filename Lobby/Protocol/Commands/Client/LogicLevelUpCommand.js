const AvailableServerCommandMessage = require("../../Messages/Server/AvailableServerCommandMessage");

class LogicLevelUpCommand {
    decode(self) {
        self.readVInt()
        self.readVInt()
        self.readVInt()
        self.readVInt()
        this.brawler = self.readDataReference()[1]
        console.log("Brawler: ", this.brawler)

    }

    async process(self) {
        let brawlerlevel = self.player.brawlersPowerLevel[this.brawler.toString()] || 0

        let cost = 0;
        if (brawlerlevel === 0) cost = 20; // 1 -> 2
        else if (brawlerlevel === 1) cost = 35; // 2 -> 3
        else if (brawlerlevel === 2) cost = 75; // 3 -> 4
        else if (brawlerlevel === 3) cost = 140; // 4 -> 5
        else if (brawlerlevel === 4) cost = 290; // 5 -> 6
        else if (brawlerlevel === 5) cost = 480; // 6 -> 7
        else if (brawlerlevel === 6) cost = 800; // 7 -> 8
        else if (brawlerlevel === 7) cost = 1250; // 8 -> 9
        else if (brawlerlevel === 8) cost = 1875; // 9 -> 10
        else return; // Max level reached

        if (self.player.coins >= cost) {
            self.player.coins -= cost;
            self.player.brawlersPowerLevel[this.brawler.toString()] = brawlerlevel + 1;

            await self.db.updateAccountData(self.player.high_id, self.player.low_id, '', 'coins', self.player.coins);
            await self.db.updateAccountData(self.player.high_id, self.player.low_id, '', 'brawlersPowerLevel', self.player.brawlersPowerLevel);
        } else {
            console.log("Not enough coins to level up brawler!");
        }
    }
}

module.exports = LogicLevelUpCommand;
