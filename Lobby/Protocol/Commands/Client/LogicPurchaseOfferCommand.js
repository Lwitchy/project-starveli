const AvailableServerCommandMessage = require("../../Messages/Server/AvailableServerCommandMessage")
const LogicBuyPinPacks = require("../../Commands/Server/LogicBuyPinPacks");
class LogicPurchaseOfferCommand {
    decode(self) {
        // LogicCommand::decode
        self.readVInt()
        self.readVInt()
        self.readVInt()

        this.offer_freeIndex = self.readVInt()
        this.offer_index = self.readVInt()
        this.offer_brawler = self.readDataReference()
    }

    async generatePinPacks(self) {

        return selectedPins;
    }

    async process(self) {

        if (this.offer_index >= 0) {
            let offers = self.player.offers;
            let offer_header = offers[this.offer_index]['offerHeader'];
            let offer_cost = offers[this.offer_index]['offerCost'];
            let offer_type = offers[this.offer_index]['offerType'];
            let offer_isClaimed = offers[this.offer_index]['offer_isClaimed'];

            if (offer_type === 0) {
                if (self.player.gems < offer_cost) {
                    console.log("Invalid transaction")
                    return;
                }

                if (!offer_cost <= 0) {
                    self.player.gems = self.player.gems - offer_cost
                }
            }

            if (offer_isClaimed === true) {
                console.log("Invalid transaction")
                return;
            }


            self.player.delivery_items = {
                'Count': 1,
                'Items': [],
                'rewardTrackType': 0,
                'rewardForRank': 0,
                'season': 0
            };

            // Add items to delivery_items
            for (let x of offer_header) {
                let offer_id = x.ID;
                let offer_count = x.Count;
                let offer_drid = x.DRID;
                let offer_itemID = x.itemID

                //console.log("DEBUG: Offer header " + offer_id + " " + offer_count + " " + offer_drid + " " + offer_itemID)

                if (offer_id === 0) {
                    // Daily Box
                    let item = { 'Type': 10, 'Amount': offer_count, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    for (let i = 0; i < offer_count; i++) {
                        self.player.delivery_items['Items'].push(item);
                    }
                }

                if (offer_id === 1) {
                    // Gold
                    let item = { 'Type': 100, 'Amount': offer_count, 'DRID': offer_drid, 'Value': 7 };
                    self.player.delivery_items['Items'].push(item);
                    {
                        // Update Player Data
                        self.player.coins += offer_count;
                    }
                }

                if (offer_id === 2) {
                    // Random brawler? Rarity
                    return;
                }

                if (offer_id === 3) {
                    // Brawler
                    let item = { 'Type': 100, 'Amount': offer_count, 'DRID': offer_drid, 'Value': 1 };
                    self.player.delivery_items['Items'].push(item);
                    {
                        self.player.unlocked_brawlers.push(offer_drid)
                    }
                }

                if (offer_id === 4) {
                    console.log("Skin ID: ", offer_itemID)
                    // Skin
                    let item = { 'Type': 100, 'Amount': offer_count, 'SkinID': [29, offer_itemID], 'DRID': offer_drid, 'Value': 9 };
                    self.player.delivery_items['Items'].push(item);
                    {
                        self.player.unlocked_skins.push(offer_itemID)
                    }
                }

                if (offer_id === 5) {
                    // ?
                    console.log("Invalid Transaction! [UNRECOGNIZED OFFER]");
                    return;
                }

                if (offer_id === 6) {
                    // Brawl Box
                    let item = { 'Type': 10, 'Amount': offer_count, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    for (let i = 0; i < offer_count; i++) {
                        self.player.delivery_items['Items'].push(item);
                    }
                }

                if (offer_id === 8) {
                    let item = { 'Type': 100, 'Amount': offer_count, 'SkinID': [0, 0], 'DRID': offer_drid, 'Value': 6 };
                    self.player.delivery_items['Items'].push(item);

                    {
                        // Add PowerPoints to brawlers
                        self.player.brawlersPowerPoints[offer_drid] = (self.player.brawlersPowerPoints[offer_drid] || 0) + offer_count;
                    }

                }

                if (offer_id === 9) {
                    let item = { 'Type': 100, 'Amount': offer_count, 'SkinID': [0, 0], 'DRID': offer_drid, 'Value': 2 };
                    self.player.delivery_items['Items'].push(item);

                    {
                        self.player.tokendoublers += offer_count;
                    }
                }


                if (offer_id === 10) {
                    let item = { 'Type': 11, 'Amount': offer_count, 'DRID': 0, 'Value': 0 };
                    for (let i = 0; i < offer_count; i++) {
                        self.player.delivery_items['Items'].push(item);
                    }
                }

                if (offer_id === 14) {
                    // Big Box
                    let item = { 'Type': 12, 'Amount': offer_count, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    for (let i = 0; i < offer_count; i++) {
                        self.player.delivery_items['Items'].push(item);
                    }
                }


                if (offer_id === 15) {
                    // Brawl Box
                    let item = { 'Type': 10, 'Amount': offer_count, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
                    for (let i = 0; i < offer_count; i++) {
                        self.player.delivery_items['Items'].push(item);
                    }
                }

                if (offer_id === 16) {
                    // Gems
                    let item = { 'Type': 100, 'Amount': offer_count, 'DRID': offer_drid, 'Value': 8 };
                    self.player.delivery_items['Items'].push(item);
                    {
                        // Update Player Data
                        self.player.gems += offer_count;
                    }
                }

                if (offer_id === 19) {
                    // Pin
                    let item = { 'Type': 100, 'Amount': offer_count, 'DRID': 0, 'PinID': offer_itemID, 'Value': 11 };
                    self.player.delivery_items['Items'].push(item);

                    {
                        self.player.unlocked_pins.push(offer_itemID);
                    }
                }

                if (offer_id === 21) {
                    new LogicBuyPinPacks(self.client, self.player, self.db).send();
                    self.player.offers[this.offer_index]['offer_isClaimed'] = true;
                    await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "offers", self.player.offers).catch(() => { })
                    return;
                }

            }

            self.player.offers[this.offer_index]['offer_isClaimed'] = true;
            self.player.delivery_items['Count'] = self.player.delivery_items['Items'].length;
            new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
        }
    }
}
module.exports = LogicPurchaseOfferCommand;