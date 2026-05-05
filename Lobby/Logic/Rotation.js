const Helpers = require('../Helpers')
const slot_data = require('../Data/Events')
const config = require('../config')
// This rotateShop logic was ported from one of my old (2022/2023 approx) python server
// checks if all events have expired
function isEventRotationEnded() {
    let t = 0
    for (let x of slot_data) {
        try {
            t = Helpers.calculateTime(x['slotTime'])
        } catch (e) {
            t = 0
        }
        if (t > 0) return false
    }
    return true
}

function rotateEvents(slot_data) {
    let gemgrabMap = Math.floor(Math.random() * global.allMaps.gemgrab_maps.length)
    let showdownMap = Math.floor(Math.random() * global.allMaps.showdown_maps.length)
    let bb_map = Math.floor(Math.random() * global.allMaps.brawlball_maps.length)
    let wk_map = Math.floor(Math.random() * global.allMaps.weekend_maps.length)
    let slotTime = 0

    for (let x of slot_data) {
        try {
            slotTime = Helpers.calculateTime(x['slotTime'])
        } catch (e) {
            slotTime = 0
        }

        if (x['isLocked'] === true && x['slotTime'] <= 0) {
            if (x['slotID'] === 4) {
                x['isLocked'] = false
                x['SlotTime'] = Helpers.calculateUntilMonday()
            } else {
                x['isLocked'] = false
                x['SlotTime'] = Helpers.getAfterXminutes(45)
            }
        }

        if (slotTime <= 0 && x['isLocked'] === false) {
            if (x['slotID'] === 1) {
                x['slotMap'] = global.allMaps.gemgrab_maps[gemgrabMap]
                x['slotTime'] = Helpers.getAfterXhours(24)
                x['isLocked'] = false
                x['slotModifiers'] = []
            } // Gem Grab

            if (x['slotID'] === 2) {
                x['slotMap'] = global.allMaps.showdown_maps[showdownMap]["solo"];
                x['slotTime'] = Helpers.getAfterXhours(24)
                x['isLocked'] = false
                x['slotModifiers'] = []
            } // Showdown

            if (x['slotID'] === 3) {
                x['slotMap'] = global.allMaps.brawlball_maps[bb_map]
                x['slotTime'] = Helpers.getAfterXhours(24)
                x['isLocked'] = false
                x['slotModifiers'] = []
            } // BrawlBall

            if (x['slotID'] === 4) {
                if (Helpers.isWeekend()) {
                    x['slotMap'] = global.allMaps.weekend_maps[wk_map]
                    x['slotTime'] = Helpers.calculateUntilMonday()
                    x['isLocked'] = false
                    x['slotModifiers'] = []
                } else {
                    x['slotMap'] = global.allMaps.weekend_maps[wk_map]
                    x['slotTime'] = Helpers.calculateUntilWeekend()
                    x['isLocked'] = true
                    x['slotModifiers'] = []
                }
            } // Weekend Events

            if (x['slotID'] === 5) {
                x['slotMap'] = global.allMaps.showdown_maps[showdownMap]["duo"];
                x['slotTime'] = Helpers.getAfterXhours(24)
                x['isLocked'] = false
                x['slotModifiers'] = []
            } // Duo Showdown
        }
    }
}

async function rotateShop(player_data, self, forceRefresh = false) {
    let globalOffersDoc;
    try {
        if (!self.db || typeof self.db.getGlobalOffers !== 'function') {
            console.error("DEBUG: rotateShop failed! DB not available.");
            return false;
        }
        globalOffersDoc = await self.db.getGlobalOffers();
    } catch (err) {
        console.error("DEBUG: rotateShop failed to fetch DB offers", err);
        return false;
    }

    let shopCfg = globalOffersDoc.shopRefresh || {};
    let globalOffers = { offers: globalOffersDoc.offers || [] };

    try {
        if (!player_data.offers) player_data.offers = []

        // remove anything thats expired
        player_data.offers = player_data.offers.filter(o => {
            try { return Helpers.calculateTime(o['offerTime']) > 0 }
            catch (e) { return false }
        })

        const dailyOfferTexts = ['FREE MEGA BOX!', 'FREE BIG BOX!', 'FREE BRAWL BOX!', 'FREE COINS!', 'FREE POWER POINTS!', 'LIMITED TIME!', 'Power Points', 'Skin Offer'];

        // check if its time to refresh daily offers
        let needsRefresh = true
        let timeRemainingSeconds = config.shopRefreshSeconds || 20;

        try {
            if (player_data.last_shop_update) {
                let t = Helpers.calculateTime(player_data.last_shop_update)
                if (t > 0) {
                    needsRefresh = false;
                    timeRemainingSeconds = t;
                }
            }
        } catch (e) { }

        if (!needsRefresh && !forceRefresh) {
            for (let offer of player_data.offers) {
                if (dailyOfferTexts.includes(offer.offerText)) {
                    offer.offerTime = Helpers.getAfterXseconds(timeRemainingSeconds);
                }
            }
            // Intentionally not returning here to allow the global offers sync 
        }

        if (needsRefresh) {
            // Clear old generated offers
            let keptOffers = [];
            if (globalOffers.offers) {
                for (let go of globalOffers.offers) {
                    let h = go.offerHeader?.[0] || {};
                    let existing = player_data.offers.find(o =>
                        o.offerHeader?.[0]?.ID === h.ID &&
                        o.offerHeader?.[0]?.Count === h.Count &&
                        o.offerHeader?.[0]?.DRID === h.DRID &&
                        o.offerHeader?.[0]?.itemID === h.itemID &&
                        o.offerCost === go.offerCost
                    );
                    if (existing) keptOffers.push(existing);
                }
            }
            player_data.offers = keptOffers;

            // ok lets generate new daily shop offers
            let usedPP = []
            let usedSkins = []
            let skipSkins = [0, 17, 130, 178, 52, 63] // defaults + prereg, dont show these

            // find brawlers that are already maxed so we dont offer pp for them
            let maxed = []
            if (player_data.brawlersPowerLevel) {
                for (let b of (player_data.unlocked_brawlers || [])) {
                    if ((player_data.brawlersPowerLevel[b] || 0) >= 8) maxed.push(b)
                }
            }

            // pick a random free daily item
            let freeOptions = shopCfg.slotInformation?.slotOne || [0, 1, 2, 3, 4]
            let freeChoice = freeOptions[Math.floor(Math.random() * freeOptions.length)]

            if (freeChoice === 0) {
                addOffer(player_data, {
                    ID: 10, Count: 1, DRID: 0, ItemID: 0,
                    offerCost: 0, offerType: 0, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                    offer_isDaily: true, offer_oldCost: 0, offerText: 'FREE MEGA BOX!',
                    offerBGR: 'offer_lny', offerDSC: 0, offerDSC_type: 0
                })
            } else if (freeChoice === 1) {
                addOffer(player_data, {
                    ID: 14, Count: 1, DRID: 0, ItemID: 0,
                    offerCost: 0, offerType: 0, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                    offer_isDaily: true, offer_oldCost: 0, offerText: 'FREE BIG BOX!',
                    offerBGR: 'offer_lny', offerDSC: 0, offerDSC_type: 0
                })
            } else if (freeChoice === 2) {
                addOffer(player_data, {
                    ID: 6, Count: 1, DRID: 0, ItemID: 0,
                    offerCost: 0, offerType: 0, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                    offer_isDaily: true, offer_oldCost: 0, offerText: 'FREE BRAWL BOX!',
                    offerBGR: 'offer_lny', offerDSC: 0, offerDSC_type: 0
                })
            } else if (freeChoice === 3) {
                addOffer(player_data, {
                    ID: 1, Count: 50 + Math.floor(Math.random() * 200), DRID: 0, ItemID: 0,
                    offerCost: 0, offerType: 0, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                    offer_isDaily: true, offer_oldCost: 0, offerText: 'FREE COINS!',
                    offerBGR: 'offer_lny', offerDSC: 0, offerDSC_type: 0
                })
            } else if (freeChoice === 4) {
                let eligible = (player_data.unlocked_brawlers || []).filter(b => !maxed.includes(b) && !usedPP.includes(b))
                if (eligible.length > 0) {
                    let b = eligible[Math.floor(Math.random() * eligible.length)]
                    addOffer(player_data, {
                        ID: 8, Count: 10 + Math.floor(Math.random() * 40), DRID: b, ItemID: 0,
                        offerCost: 0, offerType: 0, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                        offer_isDaily: true, offer_oldCost: 0, offerText: 'FREE POWER POINTS!',
                        offerBGR: 'offer_lny', offerDSC: 0, offerDSC_type: 0
                    })
                    usedPP.push(b)
                }
            }

            // discounted mega box offer
            addOffer(player_data, {
                ID: 10, Count: 1, DRID: 0, ItemID: 0,
                offerCost: 60, offerType: 0, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                offer_isDaily: true, offer_oldCost: 0, offerText: 'LIMITED TIME!',
                offerBGR: 'offer_lny', offerDSC: 25, offerDSC_type: 2
            })

            // pp offers for random brawlers
            let ppSlotCount = shopCfg.slotInformation?.ppSlotCount || 3
            for (let i = 0; i < ppSlotCount; i++) {
                let eligible = (player_data.unlocked_brawlers || []).filter(b => !maxed.includes(b) && !usedPP.includes(b))
                if (eligible.length == 0) break
                let b = eligible[Math.floor(Math.random() * eligible.length)]
                let ppAmt = 20 + Math.floor(Math.random() * 80)
                let ppCost = ppAmt < 50 ? 10 + Math.floor(Math.random() * 35) : 45 + Math.floor(Math.random() * 50)
                addOffer(player_data, {
                    ID: 8, Count: ppAmt, DRID: b, ItemID: 0,
                    offerCost: ppCost, offerType: 1, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                    offer_isDaily: true, offer_oldCost: 0, offerText: 'Power Points',
                    offerBGR: 'offer_lny', offerDSC: 0, offerDSC_type: 0
                })
                usedPP.push(b)
            }

            // skin offers - build the pool first
            let skinSlotCount = shopCfg.slotInformation?.skinSlotCount || 5
            let allSkins = []
            for (let b of (player_data.unlocked_brawlers || [])) {
                if (global.allSkinsForBrawler && global.allSkinsForBrawler[b]) {
                    for (let s of global.allSkinsForBrawler[b]) {
                        if (!allSkins.includes(s)) allSkins.push(s)
                    }
                }
            }

            let skinPool = allSkins.filter(s =>
                !usedSkins.includes(s) &&
                !skipSkins.includes(s) &&
                !(player_data.unlocked_skins || []).includes(s)
            )

            for (let i = 0; i < skinSlotCount && skinPool.length > 0; i++) {
                let idx = Math.floor(Math.random() * skinPool.length)
                let skin = skinPool.splice(idx, 1)[0]
                usedSkins.push(skin)

                let cost = 0
                let currency = 0
                try {
                    let sd = global.skinPrices[skin]
                    if (sd && sd[skin]) {
                        cost = sd[skin].Cost
                        currency = sd[skin].Currency
                    }
                } catch (e) { }

                addOffer(player_data, {
                    ID: 4, Count: 1, DRID: 0, ItemID: skin,
                    offerCost: cost, offerType: currency, offerTime: Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                    offer_isDaily: false, offer_oldCost: 0, offerText: 'Skin Offer',
                    offerBGR: 'offer_legendary', offerDSC: 0, offerDSC_type: 0
                })
            }
            player_data.last_shop_update = Helpers.getAfterXseconds(config.shopRefreshSeconds || 20) // Refresh based on config
        } else if (forceRefresh) {
            player_data.offers = player_data.offers.filter(o => {
                if (dailyOfferTexts.includes(o.offerText)) return true; // Keep dailies

                return globalOffers.offers.some(go =>
                    (go.offerHeader?.[0]?.ID === o.offerHeader?.[0]?.ID) &&
                    (go.offerHeader?.[0]?.Count === o.offerHeader?.[0]?.Count) &&
                    (go.offerHeader?.[0]?.DRID === o.offerHeader?.[0]?.DRID) &&
                    (go.offerHeader?.[0]?.itemID === o.offerHeader?.[0]?.itemID) &&
                    (go.offerCost === o.offerCost)
                );
            });
        }

        let addedNewGlobalOffer = false;
        if (globalOffers.offers) {
            for (let go of globalOffers.offers) {
                let h = go.offerHeader?.[0] || {}

                let isExpired = false;
                if (go.offerTime && go.offerTime.trim() !== '') {
                    try {
                        if (Helpers.calculateTime(go.offerTime) <= 0) {
                            isExpired = true;
                        }
                    } catch (e) { }
                }
                if (isExpired) continue;

                let alreadyHave = player_data.offers.some(o =>
                    o.offerHeader?.[0]?.ID === h.ID &&
                    o.offerHeader?.[0]?.Count === h.Count &&
                    o.offerHeader?.[0]?.DRID === (h.DRID || 0) &&
                    o.offerHeader?.[0]?.itemID === (h.itemID || 0) &&
                    o.offerCost === go.offerCost
                );

                if (!alreadyHave) {
                    addOffer(player_data, {
                        ID: h.ID,
                        Count: h.Count,
                        DRID: h.DRID || 0,
                        ItemID: h.itemID || 0,
                        offerCost: go.offerCost || 0,
                        offerType: go.offerType || 0,
                        offerTime: go.offerTime || Helpers.getAfterXseconds(config.shopRefreshSeconds || 20),
                        offer_isDaily: go.offer_isDaily || false,
                        offer_oldCost: go.offer_oldCost || go.offerCost,
                        offerText: go.offerText || 'SPECIAL OFFER',
                        offerBGR: go.offerBGR || 'offer_lny',
                        offerDSC: go.offerDSC || 0,
                        offerDSC_type: go.offerDSC_type || 0
                    });
                    addedNewGlobalOffer = true;
                }
            }
        }

        if (needsRefresh || forceRefresh || addedNewGlobalOffer) {
            console.log('DEBUG: Shop rotated!');
            return true;
        }

        return false;

    } catch (error) {
        console.error('rotateShop error:', error)
        return false
    }
}

function addOffer(player_data, data) {
    player_data.offers.push({
        offerHeader: [{ ID: data.ID, Count: data.Count, DRID: data.DRID, itemID: data.ItemID }],
        offerType: data.offerType,
        offerCost: data.offerCost,
        offerTime: data.offerTime,
        offer_isClaimed: false,
        offer_isDaily: data.offer_isDaily,
        offer_oldCost: data.offer_oldCost,
        offerText: data.offerText,
        offerBGR: data.offerBGR,
        offerDSC: data.offerDSC,
        offerDSC_type: data.offerDSC_type
    })
}

module.exports = { rotateEvents, rotateShop, isEventRotationEnded }
