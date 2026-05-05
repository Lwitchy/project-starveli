const LogicBoxData = require('../../../Logic/LogicBoxData')

class LogicGiveDeliveryCommand {
    async encode(self) {
        let delivery = self.player.delivery_items

        self.writeVInt(0)
        self.writeVInt(delivery['Count'])

        console.log("Encoding delivery with " + delivery['Count'] + " items.")

        for (let i = 0; i < delivery['Count']; i++) {
            let item = delivery['Items'][i]
            self.writeVInt(item['Type'])

            if (item['Type'] == 100) {
                // direct reward item (from shop purchase etc)
                let list = []
                let left = item['Amount']
                let drid = item['DRID']
                let val = item['Value']

                for (let z of delivery['Items']) {
                    if (z.Type == 100 && left > 0) {
                        let qty = Math.min(z['Amount'], left)
                        list.push({
                            Amount: qty,
                            DRID: drid,
                            Value: val,
                            SkinID: z['SkinID'] || [0, 0],
                            SPGID: z['SPGID'] || null,
                            PinID: z['PinID'] || null
                        })
                        left -= qty
                    }
                }

                self.writeVInt(list.length)
                for (let r of list) {
                    self.writeVInt(r.Amount)
                    self.writeDataReference(16, r.DRID)
                    self.writeVInt(r.Value)
                    self.writeDataReference(r.SkinID ? r.SkinID[0] : 0, r.SkinID ? r.SkinID[1] : 0)
                    self.writeDataReference(52, r.PinID ? r.PinID[0] : 0, r.PinID ? r.PinID[1] : 0)
                    self.writeDataReference(r.SPGID ? r.SPGID[0] : 0, r.SPGID ? r.SPGID[1] : 0)
                    self.writeVInt(0)
                }

            } else if (item['Type'] == 10 || item['Type'] == 11 || item['Type'] == 12) {
                let boxResult = new LogicBoxData(self.player).randomize(item['Type'])

                self.writeVInt(boxResult['Rewards'].length)
                for (let r of boxResult['Rewards']) {
                    self.writeVInt(r['Amount'])
                    self.writeDataReference(16, r['DRID'])
                    self.writeVInt(r['Value'])
                    self.writeDataReference(r['SkinID'] ? r['SkinID'][0] : 0, r['SkinID'] ? r['SkinID'][1] : 0)
                    self.writeDataReference(0, 0)
                    self.writeDataReference(r['SPGID'] ? r['SPGID'][0] : 0, r['SPGID'] ? r['SPGID'][1] : 0)
                    self.writeVInt(0)
                }
            }
        }

        self.writeBoolean(false)
        console.log("Is it a trophy road reward? " + self.player.trophyroadreward)
        if (self.player.trophyroadreward) {
            console.log("Encoding trophy road reward with type " + self.player.rewardTrackType + " and rank " + self.player.rewardForRank);
            self.writeVInt(self.player.rewardTrackType)
            self.writeVInt(self.player.rewardForRank)
            self.writeVInt(0)
            self.writeVInt(1)
            self.writeVInt(0)
            self.writeVInt(0)
            // LogicLong
            self.writeVInt(0)
            self.writeVInt(0)
        } else if (self.player.rewardTrackType === 9 || self.player.rewardTrackType === 10) {
            self.writeVInt(self.player.rewardTrackType)
            self.writeVInt(self.player.rewardForRank)
            self.writeVInt(2)
            self.writeVInt(0)
            self.writeVInt(0)
            self.writeVInt(0)
            // LogicLong
            self.writeVInt(0)
            self.writeVInt(0)
        } else {
            self.writeVInt(0)
            self.writeVInt(0)
            self.writeVInt(0)
            self.writeVInt(1)
            self.writeVInt(0)
            self.writeVInt(0)
            self.writeLogicLong(0)
        }


        // IT'S BAD PRACTICE DON'T DO THAT
        let hi = self.player.high_id
        let lo = self.player.low_id
        self.db.updateAccountData(hi, lo, '', 'coins', self.player.coins).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'gems', self.player.gems).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'starpoints', self.player.starpoints).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'unlocked_brawlers', self.player.unlocked_brawlers).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'unlocked_skins', self.player.unlocked_skins).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'brawlersPowerPoints', self.player.brawlersPowerPoints).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'playerSkills', self.player.playerSkills).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'tokendoublers', self.player.tokendoublers || 0).catch(() => { })
        self.db.updateAccountData(hi, lo, '', 'offers', self.player.offers).catch(() => { })

        // clear delivery items after opening
        self.player.delivery_items = {
            Count: 1,
            Items: [],
            rewardTrackType: 0,
            rewardForRank: 0,
            season: 0
        }
        self.player.trophyroadreward = false
    }
}

module.exports = LogicGiveDeliveryCommand
