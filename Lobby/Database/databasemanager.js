const mongoose = require('mongoose');

// Connect to MongoDB once globally, not per-player connection
let _mongoConnected = false;
async function ensureMongoConnected(connectionString) {
    if (_mongoConnected) return;
    _mongoConnected = true;
    try {
        await mongoose.connect(connectionString, {
            maxIdleTimeMS: 86400000,
            socketTimeoutMS: 0,
            serverSelectionTimeoutMS: 5000, // fail fast if mongo is not running
        });
        console.log("Connected to database successfully!");
    } catch (error) {
        _mongoConnected = false; // allow retry
        console.error('Could not connect to MongoDB:', error.message);
        console.error('Make sure MongoDB is running. Start it with: sudo systemctl start mongod');
        throw error;
    }
}

const playerSchema = new mongoose.Schema({
    high_id: { type: Number, index: true },
    low_id: { type: Number, index: true },
    token: String,
    data: Object
});

const PlayerModel = mongoose.models.players || mongoose.model("players", playerSchema);

const globalOfferSchema = new mongoose.Schema({
    shopRefresh: Object,
    offers: Array
});

const GlobalOfferModel = mongoose.models.globaloffers || mongoose.model("globaloffers", globalOfferSchema);

const globalNotificationSchema = new mongoose.Schema({
    notifications: Array
});

const GlobalNotificationModel = mongoose.models.globalnotifications || mongoose.model("globalnotifications", globalNotificationSchema);

class databasemanager {
    constructor(player, connectionString = "mongodb://127.0.0.1:27017/lunarbrawl_dev") {
        this.player = player;
        this.connectionString = connectionString;
        this.playerDB = PlayerModel;
        this.globalOfferDB = GlobalOfferModel;
        this.globalNotificationDB = GlobalNotificationModel;
    }

    async getGlobalOffers() {
        let globalOffersDoc = await this.globalOfferDB.findOne({});
        if (!globalOffersDoc) {
            const fs = require('fs');
            const path = require('path');
            try {
                let offersFile = path.join(__dirname, '../Data/globaloffers.json');
                let defaultOffers = JSON.parse(fs.readFileSync(offersFile, 'utf8'));
                globalOffersDoc = await this.globalOfferDB.create(defaultOffers);
            } catch (e) {
                console.error("Failed to seed global offers from JSON:", e);
                return { shopRefresh: {}, offers: [] };
            }
        }
        return globalOffersDoc;
    }

    async updateGlobalOffers(updateData) {
        let globalOffersDoc = await this.globalOfferDB.findOne({});
        if (!globalOffersDoc) {
            return await this.globalOfferDB.create(updateData);
        }
        Object.assign(globalOffersDoc, updateData);
        return await globalOffersDoc.save();
    }

    async getGlobalNotifications() {
        let globalNotifsDoc = await this.globalNotificationDB.findOne({});
        if (!globalNotifsDoc) {
            globalNotifsDoc = await this.globalNotificationDB.create({ notifications: [] });
        }
        return globalNotifsDoc.notifications;
    }

    async updateGlobalNotifications(notificationData) {
        let globalNotifsDoc = await this.globalNotificationDB.findOne({});
        if (!globalNotifsDoc) {
            return await this.globalNotificationDB.create({ notifications: [notificationData] });
        }
        globalNotifsDoc.notifications.push(notificationData);
        return await globalNotifsDoc.save();
    }

    async createAccount() {
        let date_time = new Date();
        let date = ("0" + date_time.getDate()).slice(-2);
        let month = ("0" + (date_time.getMonth() + 1)).slice(-2);
        let year = date_time.getFullYear();
        let hours = date_time.getHours();
        let minutes = date_time.getMinutes();
        let createdDate = `${year}-${month}-${date} ${hours}:${minutes}`

        const data = {
            'high_id': this.player.high_id,
            'low_id': this.player.low_id,
            'token': this.player.token,
            'data': {
                'username': this.player.username,
                'isRegistered': this.player.isRegistered,
                'trophies': this.player.trophies,
                'highest_trophies': this.player.highest_trophies,
                'collected_trophyroadRewards': this.player.collected_trophyroadRewards,
                'experiencePoints': this.player.experiencePoints,
                'thumbnail': this.player.thumbnail,
                'name_color': this.player.name_color,
                'selectedSkins': this.player.selectedSkins,
                'unlocked_skins': this.player.unlocked_skins,
                'namechangeCost': this.player.nameChangeCost,
                'namechangeExist': this.player.namechangeExist,
                'offers': this.player.offers,
                'last_shop_update': this.player.last_shop_update,
                'home_brawler': this.player.home_brawler,
                'playerRegion': this.player.playerRegion,
                'playerContentCreator': this.player.playerContentCreator,
                'passSeason': this.player.passSeason,
                'collectedTokens': this.player.collectedTokens,
                'premiumTiers': this.player.premiumTiers,
                'freeTiers': this.player.freeTiers,
                'premiumBytes': this.player.premiumBytes,
                'freeBytes': this.player.freeBytes,
                'isPremiumPurchased': this.player.isPremiumPurchased,
                'quests': this.player.quests,
                'inbox': this.player.inbox,
                'unlocked_brawlers': this.player.unlocked_brawlers,
                'brawlersTrophies': this.player.brawlersTrophies,
                'brawlersHighestTrophies': this.player.brawlersHighestTrophies,
                'brawlersPowerPoints': this.player.brawlersPowerPoints,
                'brawlersPowerLevel': this.player.brawlersPowerLevel,
                'playerSkills': this.player.playerSkills,
                'playerBoxDrop': this.player.playerBoxDrop,
                'gems': this.player.gems,
                'coins': this.player.coins,
                'token_doubler': this.player.token_doubler,
                'starpoints': this.player.starpoints,
                'tutorialState': this.player.tutorialState,
                'accountCreatedTime': createdDate
            }
        }
        this.player.accountCreatedTime = createdDate;
        await this.playerDB.create(data); 
    }

    updateAccountData(high_id, low_id, token, item, value) {
        return new Promise((resolve, reject) => {
            const filter = { high_id, low_id };
            const update = { $set: { [`data.${item}`]: value } };
            this.playerDB.updateOne(filter, update, { upsert: true })
                .then(result => {
                    const modified = result.modifiedCount ?? result.nModified ?? 0;
                    const upserted = result.upsertedCount ?? result.upserted?.length ?? 0;
                    const matched = result.matchedCount ?? result.n ?? 0;
                    if (modified === 0 && upserted === 0 && matched === 0) {
                        reject(new Error(`No document found or modified for ${item}`));
                    } else {
                        resolve();
                    }
                }).catch(err => {
                    reject(err);
                });
        })
    }

    loadAccount(high_id, low_id) {
        const filter = { high_id, low_id };

        return this.playerDB.findOne(filter).then(account => {
            if (!account) {
                return -1;
            }

            return account.data;
        }).catch(error => {
            console.error(error);
            throw error;
        });
    }

    updateAllAccounts(dataDictionary) {
        const updateFields = {};
        for (const field in dataDictionary) {
            updateFields[`data.${field}`] = dataDictionary[field];
        }


        return this.playerDB.updateMany(
            {},
            { $set: updateFields },
            { strict: false }
        )
            .then(result => {
                console.log(`Accounts updated. Matched: ${result.n || result.matchedCount}, Modified: ${result.nModified || result.modifiedCount}`);
                return;
            })
            .catch(error => {
                console.error('Error updating accounts:', error);
                throw error;
            });
    }

    loadLastLowID() {
        return this.playerDB.find({})
            .sort({ low_id: -1 })
            .limit(1)
            .then(accounts => {
                if (accounts.length === 0) {
                    return 0;
                }

                const lastAccount = accounts[0];
                return lastAccount.low_id;
            })
            .catch(error => {
                console.error('Error fetching last low_id:', error);
                throw error;
            });
    }
}
module.exports = databasemanager;
module.exports.ensureMongoConnected = ensureMongoConnected;