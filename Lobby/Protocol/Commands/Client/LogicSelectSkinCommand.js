class LogicSelectSkinCommand {
    decode(self) {
        self.readVInt()
        self.readVInt()
        self.readLogicLong()
        this.skinID = self.readDataReference()[1]
    }

    async process(self) {
        if (!self.player.selectedSkins) self.player.selectedSkins = {};

        let home_brawler = 0; // fallback to 0 (Shelly)

        if (global.allSkinsForBrawler) {
            for (let brawlerId in global.allSkinsForBrawler) {
                if (global.allSkinsForBrawler[brawlerId].includes(this.skinID)) {
                    home_brawler = parseInt(brawlerId);
                    break;
                }
            }
        }

        self.player.home_brawler = home_brawler;
        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'home_brawler', self.player.home_brawler);

        self.player.selectedSkins[home_brawler.toString()] = this.skinID;
        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'selectedSkins', self.player.selectedSkins);
    }
}

module.exports = LogicSelectSkinCommand;
