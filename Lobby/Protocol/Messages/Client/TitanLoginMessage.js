const PiranhaMessage = require('../../PiranhaMessage')
const TitanLoginOkMessage = require("../Server/TitanLoginOkMessage");
const BotInfoMessage = require("../Server/BotInfoMessage");
const OwnHomeDataMessage = require("../Server/OwnHomeDataMessage");
const { rotateShop } = require('../../../Logic/Rotation');
const AvailableServerCommandMessage = require('../Server/AvailableServerCommandMessage');
const Helpers = require('../../../Helpers')
const LoginFailedMessage = require('../Server/LoginFailedMessage');
const CreateAccountOkMessage = require('../Server/CreateAccountOkMessage');


class TitanLoginMessage extends PiranhaMessage {
    constructor(payload, client, player, database) {
        super(payload);
        this.client = client;
        this.player = player;
        this.db = database;
        this.version = 0;
        this.id = 10101;
    }

    decode() {
        this.player.high_id = this.readInt()
        this.player.low_id = this.readInt()
        this.player.token = this.readString()
        this.major = this.readInt()
        this.build = this.readInt()
        this.minor = this.readInt()
        this.fingerPrintSHA = this.readString()
        /*
        Data will be like that
        Client version
        SHA of:
        accessories.csv
        bosses.csv
        cards.csv
        characters.csv
        items.csv
        locations.csv
        maps.csv
        milestones.csv
        name_colors.csv
        pins.csv
        player_thumbnails.csv
        projectiles.csv
        resources.csv
        skills.csv
        skins.csv
        skinsrarity.csv
        themes.csv

         
        */
        this.deviceModel = this.readString()
        this.readVInt();
        this.readVInt();
        this.lang = this.readString();
        this.osVersion = this.readString();


    }

    async process() {

        if(false){
            //console.log(`Player ${this.player.high_id}:${this.player.low_id} is attempting to log in with device model: ${this.deviceModel}`);
            const parts = this.deviceModel.split('|');

            if (parts[0] !== "Starveli") {
                console.log("Unauthorized client detected!");
                return this.client.send(new LoginFailedMessage(this.client, "Please use the Starveli Client."));
            }

            const clientVer = parts[1];
            const accType = parts[2];

            const clientHashes = {
                accessories: parts[3],
                bosses: parts[4],
                cards: parts[5],
                characters: parts[6],
                items: parts[7],
                locations: parts[8],
                maps: parts[9],
                milestones: parts[10],
                nameColors: parts[11],
                pins: parts[12],
                thumbnails: parts[13],
                projectiles: parts[14],
                resources: parts[15],
                skills: parts[16],
                skins: parts[17],
                rarity: parts[18],
                themes: parts[19]
            };


            let isModded = false;
            let modifiedFiles = [];

            for (const [key, clientHash] of Object.entries(clientHashes)) {
                if (global.serverHashes && global.serverHashes[key] && global.serverHashes[key] !== clientHash) {
                    if (clientHash === "VANILLA" || clientHash === "NOT_FOUND" || clientHash === "ORIGINAL_APK") continue; // File wasn't in mod folder

                    isModded = true;
                    modifiedFiles.push(key);
                }
            }

            if (isModded) {
                console.log(`[Anti-Cheat] Kicking player! Modified CSVs: ${modifiedFiles.join(", ")}`);
                new LoginFailedMessage(this.client, this.player, { code: 1, error_msg: `Modified game files detected!\nPlease remove mods for: ${modifiedFiles.join(", ")}` }).send();
                return;
            }
        }


        if (this.player.low_id === 0) {
            //if(global.lastLowID === 0){global.lastLowID = 1}
            this.player.low_id = global.lastLowID += 1;
            this.player.token = this.generateToken(10);
            await this.db.createAccount(); 

            await rotateShop(this.player, this);

            this.db.updateAccountData(this.player.high_id, this.player.low_id, "", "offers", this.player.offers).catch(e => { });
            this.db.updateAccountData(this.player.high_id, this.player.low_id, "", "last_shop_update", this.player.last_shop_update).catch(e => { });
            
            new TitanLoginOkMessage(this.client, this.player).send()
            new OwnHomeDataMessage(this.client, this.player).send()
            //new BotInfoMessage(this.client, this.player).send() // Send empty bot info for new accounts

        } else {
            let data = await this.db.loadAccount(this.player.high_id, this.player.low_id)

            if (data === -1) {
                this.client.warn(`Account not found for ${this.player.high_id}:${this.player.low_id}, rejecting login.`);
                new LoginFailedMessage(this.client, this.player, { code: 1, error_msg: "Account not found" }).send();
                return;
            }

            {
                this.player.username = data.username;
                this.player.isRegistered = data.isRegistered;
                this.player.trophies = data.trophies;
                this.player.highest_trophies = data.highest_trophies;
                this.player.collected_trophyroadRewards = data.collected_trophyroadRewards;
                this.player.experiencePoints = data.experiencePoints;
                this.player.thumbnail = data.thumbnail;
                this.player.name_color = data.name_color;
                this.player.offers = data.offers;
                this.player.inbox = data.inbox;
                this.player.passSeason = data.passSeason;
                this.player.collectedTokens = data.collectedTokens;
                this.player.premiumTiers = data.premiumTiers;
                this.player.freeTiers = data.freeTiers;
                this.player.premiumBytes = data.premiumBytes;
                this.player.freeBytes = data.freeBytes;
                this.player.isPremiumPurchased = data.isPremiumPurchased;
                this.player.selectedSkins = data.selectedSkins || {};
                this.player.home_brawler = data.home_brawler || 0;
                this.player.unlocked_skins = data.unlocked_skins || [0];
                this.player.unlocked_pins = data.unlocked_pins || [0];
                this.player.unlocked_brawlers = data.unlocked_brawlers || [0, 1];
                this.player.brawlersTrophies = data.brawlersTrophies;
                this.player.brawlersHighestTrophies = data.brawlersHighestTrophies;
                this.player.brawlersPowerPoints = data.brawlersPowerPoints;
                this.player.brawlersPowerLevel = data.brawlersPowerLevel;
                this.player.playerSkills = data.playerSkills || [];
                this.player.accountCreatedTime = data.accountCreatedTime;
                this.player.coins = data.coins;
                this.player.gems = data.gems;
                this.player.last_shop_update = data.last_shop_update || "";

                this.player.premiumBytes = Helpers.tiersToByte(this.player.premiumTiers || []);
                this.player.freeBytes = Helpers.tiersToByte(this.player.freeTiers || []);

                await rotateShop(this.player, this);

                this.db.updateAccountData(this.player.high_id, this.player.low_id, "", "offers", this.player.offers).catch(e => { });
                this.db.updateAccountData(this.player.high_id, this.player.low_id, "", "last_shop_update", this.player.last_shop_update).catch(e => { });
            }
            
            new TitanLoginOkMessage(this.client, this.player).send()
            new OwnHomeDataMessage(this.client, this.player).send()
            //new BotInfoMessage(this.client, this.player).send()

        }
    }

    generateToken(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            token += characters.charAt(randomIndex);
        }
        return token;
    }
}

module.exports = TitanLoginMessage