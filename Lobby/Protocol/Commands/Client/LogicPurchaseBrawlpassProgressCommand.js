const LoginFailedMessage = require('../../Messages/Server/LoginFailedMessage');
const CSVParse = require('../../../CSVReader/CSVParse');
const milestones = CSVParse('./Assets/csv_logic/milestones.csv');

class LogicPurchaseBrawlpassProgressCommand {
    decode(self) {
        self.readVInt()
        self.readVInt()
        self.readVInt()
        self.readVInt()
    }

    async process(self) {
        //console.log(this.decode1, this.decode2, this.decode3, this.decode4)

        // 30 gems buys the player's next tier.
        if (self.player.gems < 30) {
            new LoginFailedMessage(self.client, self.player, { code: 1, error_msg: "Not enough gems" }).send();
            return;
        }

        const season = self.player.passSeason;
        const tierRows = milestones
            .filter(r => r.Type === '10' && r.Season === season.toString() && parseInt(r.Index) >= 1)
            .sort((a, b) => parseInt(a.Index) - parseInt(b.Index));

        const currentTokens = self.player.collectedTokens || 0;


        let nextTierStart = null;
        for (let i = 0; i < tierRows.length; i++) {
            const ps = parseInt(tierRows[i].ProgressStart);
            const end = ps + parseInt(tierRows[i].Progress);
            if (currentTokens < end) {
                nextTierStart = end;
                break;
            }
        }

        if (nextTierStart === null) {
            console.log(`Tier skip rejected: player already at max tier (${currentTokens} tokens).`);
            return;
        }

        self.player.gems -= 30;
        self.player.collectedTokens = nextTierStart; 

        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'gems', self.player.gems);
        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'collectedTokens', self.player.collectedTokens);

        console.log(`Tier skip: -30 gems, collectedTokens ${currentTokens} → ${self.player.collectedTokens}`);
    }
}

module.exports = LogicPurchaseBrawlpassProgressCommand;

