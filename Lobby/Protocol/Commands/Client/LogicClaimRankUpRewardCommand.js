const AvailableServerCommandMessage = require("../../Messages/Server/AvailableServerCommandMessage");
const Helpers = require("../../../Helpers");

class LogicClaimRankUpRewardCommand {
    decode(self) {
        this.bp1 = self.readVInt()
        this.bp2 = self.readVInt()
        this.bp3 = self.readVInt()
        this.bp4 = self.readVInt()
        this.bp5 = self.readVInt()
        this.bp6 = self.readVInt()
        this.bp7 = self.readVInt()
        this.id = self.readVInt()
        this.id2 = self.readVInt()
    }

    async process(self) {
        //console.log("Brawl Pass Decode: ", this.bp1, this.bp2, this.bp3, this.bp4, this.bp5, this.bp6, this.bp7, this.id, this.id2)
        if (this.bp5 === 10) {
            if (this.bp6 === 2) {
                self.player.collectedTokens -= 500;
                self.player.delivery_items = {
                    'Count': 1,
                    'Items': [],
                    'rewardTrackType': 0,
                    'rewardForRank': 0,
                    'season': 0
                };
                self.player.delivery_items['Items'].push({ 'Type': 12, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 });
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'collectedTokens', self.player.collectedTokens);
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }
        }
    }
}
module.exports = LogicClaimRankUpRewardCommand;