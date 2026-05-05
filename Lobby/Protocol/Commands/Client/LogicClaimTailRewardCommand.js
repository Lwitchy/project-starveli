const AvailableServerCommandMessage = require("../../Messages/Server/AvailableServerCommandMessage");
const CSVParse = require("../../../CSVReader/CSVParse");
const milestones = CSVParse("./Assets/csv_logic/milestones.csv");
const characters = CSVParse("./Assets/csv_logic/characters.csv");
const skins = CSVParse("./Assets/csv_logic/skins.csv");
const Helpers = require("../../../Helpers");

class LogicClaimTailRewardCommand {
    decode(self) {
        self.readVInt();
        self.readVInt();
        self.readVInt();
        self.readVInt();

        this.MilestoneID = self.readVInt();
        this.decodeSecond = self.readVInt();
        this.brawler = self.readVInt();
        this.passT = self.readDataReference();
        this.BrawlPassTier = this.passT[0];
        this.decode5 = self.readVInt()
        this.decode6 = self.readVInt()

    }

    async grantReward(self, type, count, data) {
        type = parseInt(type) || 0;
        count = parseInt(count) || 1;

        console.log("Giving items to player", self.player.username, type, count, data)

        if (type === 1) { // Coins
            self.player.delivery_items['Items'].push({ 'Type': 100, 'Amount': count, 'DRID': 0, 'Value': 7 });
            self.player.coins += count;
            await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "coins", self.player.coins);
            return true;
        } else if (type === 16) { // Gems
            self.player.delivery_items['Items'].push({ 'Type': 100, 'Amount': count, 'DRID': 0, 'Value': 8 });
            self.player.gems += count;
            await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "gems", self.player.gems);
            return true;
        } else if (type === 12 || type === 8) { // Power Points

            self.player.delivery_items['Items'].push({ 'Type': 100, 'Amount': count, 'DRID': this.brawler, 'Value': 6 });
            self.player.brawlersPowerPoints[this.brawler] = (self.player.brawlersPowerPoints[this.brawler] || 0) + count;
            await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "brawlersPowerPoints", self.player.brawlersPowerPoints);
            return true;
        } else if (type === 3) { // Brawler
            const bIndex = characters.findIndex(c => c.Name === data);
            if (bIndex !== -1) {
                if (!self.player.unlocked_brawlers.includes(bIndex)) {
                    self.player.delivery_items['Items'].push({ 'Type': 100, 'Amount': 1, 'DRID': bIndex, 'Value': 1 });
                    self.player.unlocked_brawlers.push(bIndex);
                    await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "unlocked_brawlers", self.player.unlocked_brawlers);
                    return true;
                }
            }
            return false;
        } else if (type === 4 || type === 24) { // Skin
            const sIndex = skins.findIndex(s => s.Name === data);
            if (sIndex !== -1) {
                if (!self.player.unlocked_skins.includes(sIndex)) {
                    self.player.delivery_items['Items'].push({ 'Type': 100, 'Amount': 1, 'SkinID': [29, sIndex], 'DRID': 0, 'Value': 1 });
                    self.player.unlocked_skins.push(sIndex);
                    return true;
                }
            }
            return false;
        } else if (type === 10) { // Mega Box
            self.player.delivery_items['Items'].push({ 'Type': 11, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 });
            return true;
        } else if (type === 14) { // Big Box
            self.player.delivery_items['Items'].push({ 'Type': 12, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 });
            return true;
        } else if (type === 6) { // Brawl Box
            self.player.delivery_items['Items'].push({ 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 });
            return true;
        } else if (type === 19) { // Pin/Emote
            self.player.delivery_items['Items'].push({ 'Type': 100, 'Amount': 1, 'PinID': data, 'DRID': 0, 'Value': 11 });
            self.player.unlocked_pins.push(data);
            return true;
        }

        return true;
    }

    async process(self) {

        self.player.delivery_items = {
            'Count': 1,
            'Items': [],
            'rewardTrackType': 0,
            'rewardForRank': 0,
            'season': 0
        };

        console.log("MilestoneID", this.MilestoneID);
        console.log("BrawlPassTier", this.BrawlPassTier);


        if (this.MilestoneID === 9 || this.MilestoneID === 10) {


            if (this.passT[0] === 2) {
                if (this.passT[1] < 90) {
                    if (this.passT[1] > -1) {
                        this.BrawlPassTier = this.passT[1];
                    }
                }
            }


            self.player.rewardTrackType = this.MilestoneID;
            self.player.rewardForRank = this.BrawlPassTier + 2;
            self.player.season = self.player.passSeason;

            console.log(this.MilestoneID.toString(), self.player.passSeason.toString(), (this.BrawlPassTier).toString())

            const row = milestones.find(r => r.Type === this.MilestoneID.toString() && r.Season === self.player.passSeason.toString() && r.Index === (this.BrawlPassTier).toString());
            console.log(row)
            if (row) {
                const primaryGranted = await this.grantReward(self, row.PrimaryLvlUpRewardType, row.PrimaryLvlUpRewardCount, row.PrimaryLvlUpRewardData);
                if (!primaryGranted && row.SecondaryLvlUpRewardType && row.SecondaryLvlUpRewardType !== "-1" && row.SecondaryLvlUpRewardType !== "6") {
                    await this.grantReward(self, row.SecondaryLvlUpRewardType, row.SecondaryLvlUpRewardCount, row.SecondaryLvlUpRewardData);
                }
            }

            self.player.delivery_items['Count'] = self.player.delivery_items['Items'].length;
            new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();

            if (this.MilestoneID === 9) {
                if (!self.player.premiumTiers.includes(this.BrawlPassTier)) {
                    self.player.premiumTiers.push(this.BrawlPassTier);
                    await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "premiumTiers", self.player.premiumTiers);
                }
            } else {
                if (!self.player.freeTiers.includes(this.BrawlPassTier)) {
                    self.player.freeTiers.push(this.BrawlPassTier);
                    await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "freeTiers", self.player.freeTiers);
                }
            }

            self.player.premiumBytes = Helpers.tiersToByte(self.player.premiumTiers || []);
            self.player.freeBytes = Helpers.tiersToByte(self.player.freeTiers || []);
        } else {
            // Trophy Road
            self.player.rewardForRank = self.player.collected_trophyroadRewards + 1;
            self.player.rewardTrackType = 6;

            const reward = self.player.collected_trophyroadRewards;

            console.log("Processing Trophy Road reward,, Current reward index: " + reward);

            /*
                I'm lazy and going to use my old codes for that which is hardcoded rewards, I don't have time to
                go into csv hell again and make something dynamic. if it works don't touch it :P
            */

            // BrawlBox
            if (reward === 1 || reward === 3 || reward === 5 || reward === 14 || reward === 20) {
                let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Nita
            if (reward === 2) {
                if (self.player.unlocked_brawlers.includes(8)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 8, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(8)) {
                        self.player.unlocked_brawlers.push(8);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Tokens
            if (reward === 7) {
                let item = { 'Type': 100, 'Amount': 200, 'DRID': 0, 'Value': 2 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.token_doubler = self.player.token_doubler + 200;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'token_doubler', self.player.token_doubler);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points (9, 13, 17, 22)
            if (reward === 9 || reward === 13 || reward === 17 || reward === 22) {
                let item = { 'Type': 100, 'Amount': 25, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 25;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Colt
            if (reward === 6) {
                if (self.player.unlocked_brawlers.includes(1)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 1, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(1)) {
                        self.player.unlocked_brawlers.push(1);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Brawler
            if (reward === 10) {
                if (self.player.unlocked_brawlers.includes(2)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 2, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(2)) {
                        self.player.unlocked_brawlers.push(2);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Brawler
            if (reward === 15) {
                if (self.player.unlocked_brawlers.includes(7)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 7, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(7)) {
                        self.player.unlocked_brawlers.push(7);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Coins (16, 19)
            if (reward === 16 || reward === 19) {
                let item = { 'Type': 100, 'Amount': 50, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 50;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Reward Type 12 & 18 & 24 & 31 & 33 & 58
            if (reward === 18 || reward === 24 || reward === 31 || reward === 33 || reward === 58) {
                let item = { 'Type': 12, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Brawler (ID 3)
            if (reward === 25) {
                if (self.player.unlocked_brawlers.includes(3)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 3, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(3)) {
                        self.player.unlocked_brawlers.push(3);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Coins: 50 (Rewards 23, 26, 32, 36, 39, 44, 46, 50, 54)
            if (reward === 23 || reward === 26 || reward === 32 || reward === 36 || reward === 39 || reward === 44 || reward === 46 || reward === 50 || reward === 54) {
                let item = { 'Type': 100, 'Amount': 50, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 50;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // BrawlBox (Rewards 27, 37, 40, 49, 52, 62)
            if (reward === 27 || reward === 37 || reward === 40 || reward === 49 || reward === 52 || reward === 62) {
                let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 75 (Reward 28)
            if (reward === 28) {
                let item = { 'Type': 100, 'Amount': 75, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 75;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Coins: 100 (Reward 29)
            if (reward === 29) {
                let item = { 'Type': 100, 'Amount': 100, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 100;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 50 (Rewards 30, 34)
            if (reward === 30 || reward === 34) {
                let item = { 'Type': 100, 'Amount': 50, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 50;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Brawler (ID 9)
            if (reward === 35) {
                if (self.player.unlocked_brawlers.includes(9)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 9, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(9)) {
                        self.player.unlocked_brawlers.push(9);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Power Points: 150 (Rewards 38, 56)
            if (reward === 38 || reward === 56) {
                let item = { 'Type': 100, 'Amount': 150, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 150;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Coins: 150 (Reward 41)
            if (reward === 41) {
                let item = { 'Type': 100, 'Amount': 150, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 150;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 25 (Rewards 43, 47, 53, 59, 61)
            if (reward === 43 || reward === 47 || reward === 53 || reward === 59 || reward === 61) {
                let item = { 'Type': 100, 'Amount': 25, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 25;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Brawler (ID 14)
            if (reward === 45) {
                if (self.player.unlocked_brawlers.includes(14)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 14, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(14)) {
                        self.player.unlocked_brawlers.push(14);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Coins: 300 (Reward 48)
            if (reward === 48) {
                let item = { 'Type': 100, 'Amount': 300, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 300;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Token Doubler: 600 (Reward 51)
            if (reward === 51) {
                let item = { 'Type': 100, 'Amount': 600, 'DRID': 0, 'Value': 2 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.token_doubler = self.player.token_doubler + 600;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'token_doubler', self.player.token_doubler);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Brawler(ID 22)
            if (reward === 55) {
                if (self.player.unlocked_brawlers.includes(22)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 22, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(22)) {
                        self.player.unlocked_brawlers.push(22);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Coins: 200 (Reward 57)
            if (reward === 57) {
                let item = { 'Type': 100, 'Amount': 200, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 200;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // (Reward 60)
            if (reward === 60) {
                let item = { 'Type': 11, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Coins: 150 (Rewards 63, 81, 83)
            if (reward === 63 || reward === 81 || reward === 83) {
                let item = { 'Type': 100, 'Amount': 150, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 150;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 25 (Reward 64)
            if (reward === 64) {
                let item = { 'Type': 100, 'Amount': 25, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 25;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Brawler (ID 27)
            if (reward === 65) {
                if (self.player.unlocked_brawlers.includes(27)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 27, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(27)) {
                        self.player.unlocked_brawlers.push(27);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Coins: 200 (Rewards 66, 69)
            if (reward === 66 || reward === 69) {
                let item = { 'Type': 100, 'Amount': 200, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 200;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Reward Type 12 (Rewards 67, 73, 76, 78, 84, 96)
            if (reward === 67 || reward === 73 || reward === 76 || reward === 78 || reward === 84 || reward === 96) {
                let item = { 'Type': 12, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 150 (Rewards 68, 77)
            if (reward === 68 || reward === 77) {
                let item = { 'Type': 100, 'Amount': 150, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 150;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Reward Type 11 (Rewards 70, 80, 85, 87, 89, 91, 93, 95)
            if (reward === 70 || reward === 80 || reward === 85 || reward === 87 || reward === 89 || reward === 91 || reward === 93 || reward === 95) {
                let item = { 'Type': 11, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Coins: 50 (Rewards 71, 74)
            if (reward === 71 || reward === 74) {
                let item = { 'Type': 100, 'Amount': 50, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 50;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 25 (Reward 72)
            if (reward === 72) {
                let item = { 'Type': 100, 'Amount': 25, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 25;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Brawler (ID 30)
            if (reward === 75) {
                if (self.player.unlocked_brawlers.includes(30)) {
                    let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    self.player.delivery_items['Items'].push(item);
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                } else {
                    let item = { 'Type': 100, 'Amount': 1, 'DRID': 30, 'Value': 1 };
                    self.player.delivery_items['Type'] = 100;
                    self.player.delivery_items['Items'].push(item);
                    if (!self.player.unlocked_brawlers.includes(30)) {
                        self.player.unlocked_brawlers.push(30);
                        await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'unlocked_brawlers', self.player.unlocked_brawlers);
                    }
                    self.player.trophyroadreward = true;
                    new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
                }
            }

            // Coins: 2000 (Reward 79)
            if (reward === 79) {
                let item = { 'Type': 100, 'Amount': 2000, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 2000;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 50 (Reward 82)
            if (reward === 82) {
                let item = { 'Type': 100, 'Amount': 50, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 50;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Coins: 500 (Rewards 86, 90)
            if (reward === 86 || reward === 90) {
                let item = { 'Type': 100, 'Amount': 500, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 500;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 200 (Reward 88)
            if (reward === 88) {
                let item = { 'Type': 100, 'Amount': 200, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 200;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Power Points: 100 (Reward 92)
            if (reward === 92) {
                let item = { 'Type': 100, 'Amount': 100, 'DRID': this.brawler, 'Value': 6 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.brawlersPowerPoints[String(this.brawler)] = self.player.brawlersPowerPoints[String(this.brawler)] + 100;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'brawlersPowerPoints', self.player.brawlersPowerPoints);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Coins: 1000 (Reward 94)
            if (reward === 94) {
                let item = { 'Type': 100, 'Amount': 1000, 'DRID': 0, 'Value': 7 };
                self.player.delivery_items['Type'] = 100;
                self.player.delivery_items['Items'].push(item);
                self.player.gold += 1000;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'coins', self.player.gold);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Generic pattern for rewards > 96: alternating mega (11) and big (12) boxes
            if (reward > 96) {
                let boxType = (reward % 2 === 0) ? 12 : 11;
                let item = { 'Type': boxType, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);
                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Fallback
            if (!self.player.trophyroadreward) {
                console.log("Warning: Uncovered reward value: " + reward);
                let item = { 'Type': 10, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                self.player.delivery_items['Items'].push(item);

                self.player.trophyroadreward = true;
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }

            // Increment reward and update database
            self.player.collected_trophyroadRewards += 1;
            await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", 'collected_trophyroadRewards', self.player.collected_trophyroadRewards);
        }
    }
}

module.exports = LogicClaimTailRewardCommand;