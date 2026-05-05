const LoginFailedMessage = require('../../Messages/Server/LoginFailedMessage');
const CSVParse = require('../../../CSVReader/CSVParse');
const milestones = CSVParse('./Assets/csv_logic/milestones.csv');

class LogicPurchaseBrawlPass {
    decode(self) {
        self.readVInt()
        self.readVInt()
        self.readVInt()
        self.readVInt()

        this.decode1 = self.readVInt()
        this.decode2 = self.readBoolean()
    }

    async process(self) {
        console.log(this.decode1, this.decode2)
        // hate my life
        if (this.decode2 === false) {
            // Cheap Pass 169
            if (self.player.gems >= 169) {
                self.player.gems -= 169
                self.player.isPremiumPurchased = true
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'gems', self.player.gems);
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'isPremiumPurchased', self.player.isPremiumPurchased);
            }
        } else if (this.decode2 === true) {
            // Expensive Pass 249 + ~10 tiers worth of tokens
            if (self.player.gems >= 249) {
                self.player.gems -= 249;
                self.player.isPremiumPurchased = true;

                const PASS_TOKENS = 2750;
                const rawTokens = (self.player.collectedTokens || 0) + PASS_TOKENS;

                const season = self.player.passSeason;
                const tierRows = milestones
                    .filter(r => r.Type === '10' && r.Season === season.toString() && parseInt(r.Index) >= 1)
                    .sort((a, b) => parseInt(a.Index) - parseInt(b.Index));

                let snappedTokens = rawTokens;
                for (let i = 0; i < tierRows.length; i++) {
                    const ps = parseInt(tierRows[i].ProgressStart);
                    const end = ps + parseInt(tierRows[i].Progress);
                    if (rawTokens >= ps && rawTokens < end) {
                        snappedTokens = ps;
                        break;
                    }
                }

                self.player.collectedTokens = snappedTokens;

                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'gems', self.player.gems);
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'isPremiumPurchased', self.player.isPremiumPurchased);
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'collectedTokens', self.player.collectedTokens);

                console.log(`Expensive Pass: ${self.player.collectedTokens - PASS_TOKENS < 0 ? 0 : self.player.collectedTokens - PASS_TOKENS} + ${PASS_TOKENS} zeroed to >> ${snappedTokens}`);
            }
        } else {
            new LoginFailedMessage(self.client, self.player, { code: 1, error_msg: "Invalid transaction" }).send();
        }
    }
}

module.exports = LogicPurchaseBrawlPass;
