const PiranhaMessage = require('../../PiranhaMessage')
const slot_data = require('../../../Data/Events');
const Helpers = require('../../../Helpers');
class OwnHomeDataMessage extends PiranhaMessage {
    constructor(client, player) {
        super();
        this.id = 24101;
        this.version = 27;
        this.client = client;
        this.player = player;
        this.timeStamp = Math.floor(Date.now() / 1000);
    }

    encode() {
        this.writeVInt(0);
        this.writeVInt(0);

        this.writeVInt(this.player.trophies); // Player trophies
        this.writeVInt(this.player.highest_trophies); // Player high trophies
        this.writeVInt(this.player.highest_trophies); // Player daily high trophies

        this.writeVInt(this.player.collected_trophyroadRewards); // Player collected trophy road rewards
        this.writeVInt(this.player.experiencePoints); // Player experience points amount

        this.writeDataReference(28, this.player.thumbnail); // Player thumbnail
        this.writeDataReference(43, this.player.name_color); // Player name color

        this.writeVInt(0); // Player played game modes

        let selSkins = Object.values(this.player.selectedSkins || {});
        this.writeVInt(selSkins.length); // Player selected skins
        for (let skin of selSkins) {
            this.writeDataReference(29, skin);
        }

        let unlSkins = this.player.unlocked_skins || [];
        this.writeVInt(unlSkins.length); // Player unlocked skins
        for (let skin of unlSkins) {
            this.writeDataReference(29, skin);
        }

        this.writeVInt(0);

        this.writeVInt(0); // Leaderboard region | Asia, Global
        this.writeVInt(0); // Player highest leage trophies
        this.writeVInt(0); // Star tokens gained in battles
        this.writeVInt(0); // Tokens used in battles

        this.writeBoolean(false); // Token limit reached state

        this.writeVInt(this.player.token_doubler); // Tokens remaining from token doubler
        this.writeVInt(this.player.trophySeasonEndTimer); // Trophy road Timer
        this.writeVInt(0); // Token doubler seen state
        this.writeVInt(this.player.seasonEndTimer); // Brawl pass timer

        this.writeVInt(0);

        this.writeVInt(1);
        this.writeVInt(1);

        this.writeVInt(0);

        this.writeBoolean(false); // Token doubler state
        this.writeVInt(0); // Token doubler seen state
        this.writeVInt(0); // Event tickets seen state
        this.writeVInt(0); // Coin packs seen state

        this.writeVInt(0); // Change name cost
        this.writeVInt(0); // Time for next name change

        this.LogicShopData(this)

        this.writeVInt(0); // Brawl box ads

        this.writeVInt(this.player.availableTokens); // Available tokens from battles
        this.writeVInt(0); // Time for new tokens
        this.writeVInt(0); // Event tickets purchased index
        this.writeVInt(0); // Player Event tickets
        this.writeVInt(0); // Tickets

        this.writeDataReference(16, this.player.home_brawler); // Home brawler

        this.writeString(this.player.region); // Region
        this.writeString(this.player.content_creator); // Content creator

        this.writeVInt(11); // Int Value Entry
        {
            this.writeInt(3)
            this.writeInt(this.player.tokenAnim) // Token Animation

            this.writeInt(4)
            this.writeInt(this.player.trophy_animation)

            this.writeInt(6)
            this.writeInt(this.player.isDemoAccount) // DemoAccount

            this.writeInt(7) // Invited Blocked
            this.writeInt(this.player.isInvitesBlocked)

            this.writeInt(8) // Animation star points
            this.writeInt(this.player.starAnim)

            this.writeInt(9) // Show star points?
            this.writeInt(1)

            this.writeInt(10) // PowerPlay Trophies Gained
            this.writeInt(0)

            this.writeInt(14)
            this.writeInt(this.player.coinAnim) // Coin Animation

            this.writeInt(15) // Agree Screen | 3 underage | 1 = age popup | 0 = nothing pops out
            this.writeInt(this.player.playerAgeStatus)

            this.writeInt(17) // Team Chat Muted
            this.writeInt(0)

            this.writeInt(20)
            this.writeInt(10) // Gems


        }


        /*
        
                self.writeLongInt(14, self.player.coinAnim)  # Animation Coins
        
                self.writeLongInt(3, self.player.tokenAnim) # Animation Tokens
        
                self.writeLongInt(9, 1) # Show star points?
        
                self.writeLongInt(8, 0)  # Animation star points
        
                self.writeLongInt(20, 10)# Gems
        
                self.writeLongInt(6, 0)  # DemoAccount
                # Home Events Array End
        */

        this.writeVInt(0); // Cooldown Items Count

        this.writeVInt(1); // Brawl pass array
        {
            this.writeVInt(this.player.passSeason)
            this.writeVInt(this.player.collectedTokens) // Tokens
            this.writeBoolean(this.player.isPremiumPurchased)
            this.writeVInt(0)

            this.writeByte(1)
            this.writeInt(this.player.premiumBytes[0] || 0) // Premium Brawl Pass
            this.writeInt(this.player.premiumBytes[1] || 0) // Entry two
            this.writeInt(this.player.premiumBytes[2] || 0) // Entry three
            this.writeInt(this.player.premiumBytes[3] || 0)

            this.writeByte(1)
            this.writeInt(this.player.freeBytes[0] || 0) // Free Brawl Pass | 1-29
            this.writeInt(this.player.freeBytes[1] || 0) // Entry two | 30+
            this.writeInt(this.player.freeBytes[2] || 0) // Entry three
            this.writeInt(this.player.freeBytes[3] || 0)
        }

        this.writeVInt(0); // Power Play Season data

        this.writeBoolean(true); // Logic Quests Array
        this.writeVInt(0);

        this.writeBoolean(true); // Logic Exc Player accessories array
        this.writeVInt(this.player.unlocked_pins.length);
        for (let x = 0; x < this.player.unlocked_pins.length; x++) {
            console.log(this.player.unlocked_pins[x])
            this.writeDataReference(52, this.player.unlocked_pins[x]);
            this.writeVInt(1);
            this.writeVInt(2);
            this.writeVInt(1);
        }

        this.LogicConfData(this)

        this.writeLong(this.player.high_id, this.player.low_id);

        // Notifications Array
        let combinedNotifications = [];
        if (this.player.inbox && this.player.inbox.length > 0) {
            combinedNotifications = [...this.player.inbox].reverse();
        }

        this.writeVInt(combinedNotifications.length); // Notifications Count
        if (combinedNotifications.length !== 0) {
            let nId = 1;
            for (let inbox_data of combinedNotifications) {
                let notifId = inbox_data.NotificationID || 81;
                this.writeVInt(notifId); // Notification ID
                this.writeInt(nId++); // Notification Index

                let isRead = inbox_data.IsRead || false;
                this.writeBoolean(isRead); // Notification Read
                this.writeInt(Math.floor(Date.now() / 1000) - (inbox_data.Timer || Math.floor(Date.now() / 1000))); // Notification Time Ago
                this.writeString(inbox_data.Message || ""); // Notification Message Entry

                // Extra fields depending on Notification ID
                if (notifId === 81 || notifId === 82) {
                    // Support Message or Club Mail
                    this.writeVInt(0);
                } else if (notifId === 83) {
                    // Promo Popup
                    this.writeInt(0)
                    this.writeString(inbox_data.PrimaryText || ""); // Primary Text Entry
                    this.writeInt(0)
                    this.writeString(inbox_data.SecondaryText || ""); // Secondary Text Entry
                    this.writeInt(0)
                    this.writeString(inbox_data.ButtonText || ""); // Button Text Entry
                    this.writeString(inbox_data.BannerFile || ""); // File Name
                    this.writeString(inbox_data.BannerHash || ""); // Hash
                    this.writeString(inbox_data.EventLink || ""); // Event Link
                    this.writeVInt(0);
                } else if (notifId === 85) {
                    // Gems Refunded
                    this.writeVInt(0); // Revoke Type
                    this.writeVInt(inbox_data.GemsRevoked || 0); // Gems Revoked
                    this.writeLong(0, 1); // Player ID
                    this.writeVInt(0);
                    this.writeString("");
                } else if (notifId === 87) {
                    // News
                    this.writeStringReference(inbox_data.NewsLink || "");
                } else if (notifId === 89) {
                    // Gems Donated
                    this.writeVInt(0);
                    this.writeVInt(inbox_data.GemsDonated || 0); // Gems Donated
                } else {
                    this.writeVInt(0);
                }
            }
        }
        // Notification factory end

        this.writeVInt(0);
        this.writeVInt(0);

        // Gatcha items array
        this.writeVInt(0);
        // Gatcha items array

        this.writeVInt(0);

        // Logic Client Avatar

        this.writeLogicLong(this.player.high_id, this.player.low_id)
        this.writeLogicLong(0, 1)
        this.writeLogicLong(0, 1)

        this.writeString(this.player.username) // Player Name
        this.writeBoolean(this.player.isRegistered) // Registered Name State

        this.writeInt(0)

        this.writeVInt(8) // Commodity Count

        // Unlocked Brawlers & Resources array
        this.writeVInt(this.player.unlocked_brawlers.length + 1)
        {
            for (let i of this.player.unlocked_brawlers) {
                this.writeDataReference(23, global.cardIDs[i])
                this.writeVInt(1)
            }
            {
                // Resources
                this.writeDataReference(5, 8)
                this.writeVInt(this.player.coins)
            }
        }

        // Brawlers Trophies array
        this.writeVInt(this.player.unlocked_brawlers.length)  // brawlers count
        for (let x of this.player.unlocked_brawlers) {
            this.writeDataReference(16, x);
            this.writeVInt(this.player.brawlersTrophies[x]);
        }

        // Brawlers Trophies for Rank array
        this.writeVInt(this.player.unlocked_brawlers.length)  // brawlers count
        for (let x of this.player.unlocked_brawlers) {
            this.writeDataReference(16, x);
            this.writeVInt(this.player.brawlersHighestTrophies[x]);
        }

        this.writeVInt(0)  // Unknown array

        // Brawlers Upgrade Points array
        this.writeVInt(this.player.unlocked_brawlers.length)  // brawlers count
        for (let x of this.player.unlocked_brawlers) {
            this.writeDataReference(16, x);
            this.writeVInt(this.player.brawlersPowerPoints[x]);
        }

        // Brawlers Power Level array
        this.writeVInt(this.player.unlocked_brawlers.length)  // brawlers count
        for (let x of this.player.unlocked_brawlers) {
            this.writeDataReference(16, x);
            this.writeVInt(this.player.brawlersPowerLevel[x]);
        }

        // Gadgets and Star Powers array
        this.writeVInt(this.player.playerSkills.length)
        for (let x of this.player.playerSkills) {
            this.writeDataReference(23, x);
            this.writeVInt(1)
        }


        // "new" Brawler Tag array
        this.writeVInt(0)  // brawlers count

        this.writeVInt(this.player.gems)  // Player Gems
        this.writeVInt(this.player.gems)  // Player Gems

        this.writeVInt(0)  // Player Experience Level
        this.writeVInt(0)  // Unknown
        this.writeVInt(0) // Cumulative Purchased Gems
        this.writeVInt(0) // Battles Count
        this.writeVInt(0) // Win Count
        this.writeVInt(0) // Lose Count
        this.writeVInt(0) // Win/Loose Streak
        this.writeVInt(0) // Npc Win Count
        this.writeVInt(0) // Npc Lose Count
        this.writeVInt(this.player.tutorialState)  // Tutorial State
        this.writeVInt(0) // Current Time
        this.player.trophy_animation = 0;
    }

    LogicShopData(self) {
        self.writeVInt(self.player.offers.length); // LogicShopData
        {
            for (let x of self.player.offers) {
                self.writeVInt(x.offerHeader.length)
                let offerIndex = 0;
                for (let i of x.offerHeader) {
                    self.writeVInt(i['ID']);
                    self.writeVInt(i['Count']);
                    self.writeDataReference(16, i['DRID']);
                    self.writeVInt(i['itemID']);
                }

                self.writeVInt(x['offerType']); // 0 = Offer, 2 = Skins, 3 = Star Shop
                self.writeVInt(x['offerCost']);
                self.writeVInt(Helpers.calculateTime(x['offerTime'])); // Timer

                self.writeVInt(1); // State | 0 = Abolutely new, 1 = new, 2 = viewed
                self.writeVInt(100); // State

                self.writeBoolean(x['offer_isClaimed']);

                self.writeBoolean(false);

                self.writeVInt(0); // Shop Display | 0 = Normal, 1 = Daily deals
                self.writeBoolean(x['offer_isDaily']); // Old Cost
                self.writeVInt(10);

                self.writeInt(0);

                self.writeStringReference(x['offerText']);

                self.writeBoolean(false);
                self.writeStringReference(x['offerBGR']);
                self.writeVInt(0);

                self.writeBoolean(false);

                self.writeVInt(x['offerDSC_type'])
                self.writeVInt(x['offerDSC'])
            }
        }
    }

    LogicConfData(self) {
        // LogicConfData
        self.writeVInt(0); // Current year & day
        self.writeVInt(100); // Brawl box tokens
        self.writeVInt(10); // Shop brawl box cost
        self.writeVInt(30); // Shop big box cost
        self.writeVInt(3); // Shop big box multipler
        self.writeVInt(80); // Shop mega box cost
        self.writeVInt(10); // Shop mega box multipler
        self.writeVInt(40); // Token doubler cost
        self.writeVInt(1000); // Token doubler amount
        self.writeVInt(500); // Minimum brawler trophies for season reset
        self.writeVInt(50); // Brawler trophy loss percentage in season reset
        self.writeVInt(500); // Token limit amount

        self.writeVInt(0); // Boxes with guaranteed brawlers

        self.writeVInt(16); // Event slots array
        self.writeVInt(1);
        self.writeVInt(2);
        self.writeVInt(3);
        self.writeVInt(4);
        self.writeVInt(5);
        self.writeVInt(6);
        self.writeVInt(7);
        self.writeVInt(8);
        self.writeVInt(9);
        self.writeVInt(10);
        self.writeVInt(11);
        self.writeVInt(20);
        self.writeVInt(21);
        self.writeVInt(22);
        self.writeVInt(23);
        self.writeVInt(24);


        // Event slots data array
        self.writeVInt(slot_data.length);
        for (let x of slot_data) {

            self.writeVInt(x['slotID']); // Event ID For Gamerooms
            self.writeVInt(x['slotID']); // Event ID

            if (x['isLocked'] === true) {
                self.writeVInt(Helpers.calculateTime(x['slotTime'])); // New event timer
            } else {
                self.writeVInt(0);
            }

            if (x['isLocked'] === false) {
                try {
                    self.writeVInt(Helpers.calculateTime(x['slotTime'])); // Event timer

                } catch (error) {
                    self.writeVInt(0);
                }
            } else {
                self.writeVInt(0);
            }

            self.writeVInt(0); // New event reward amount
            self.writeDataReference(15, x['slotMap']); // Location ID

            if (x['isLocked'] === true) {
                self.writeVInt(2); // Event state
            } else {
                self.writeVInt(3)
            }

            self.writeString(); // Event text entry
            self.writeVInt(0); // Event tickets amount
            self.writeVInt(0); // Powerplay game played
            self.writeVInt(0); // Powerplay game left maximum
            self.writeVInt(0); // Event modifiers
            self.writeVInt(0); // Ticketed events difficulty
            self.writeVInt(0); // Unknown
        }
        // Event slots data array end



        // Unused events array & locked events array
        self.writeVInt(0);
        // Unused events array & locked events array

        // Brawler Coins upgrade cost
        self.writeVInt(8);
        self.writeVInt(20);
        self.writeVInt(35);
        self.writeVInt(75);
        self.writeVInt(140);
        self.writeVInt(290);
        self.writeVInt(480);
        self.writeVInt(800);
        self.writeVInt(1250);

        // Highstakes rewards
        self.writeVInt(8);
        self.writeVInt(1);
        self.writeVInt(2);
        self.writeVInt(3);
        self.writeVInt(4);
        self.writeVInt(5);
        self.writeVInt(10);
        self.writeVInt(15);
        self.writeVInt(20);

        // Event tickets cost
        self.writeVInt(3);
        self.writeVInt(1);
        self.writeVInt(1);
        self.writeVInt(1);

        // Event tickets amount
        self.writeVInt(3);
        self.writeVInt(1);
        self.writeVInt(1);
        self.writeVInt(1);

        // Coin packs cost
        self.writeVInt(4);
        self.writeVInt(20);
        self.writeVInt(50);
        self.writeVInt(140);
        self.writeVInt(200);

        // Coin packs amount
        self.writeVInt(4);
        self.writeVInt(1000);
        self.writeVInt(2500);
        self.writeVInt(4500);
        self.writeVInt(8000);

        self.writeVInt(0); // Coin packs state
        self.writeVInt(500); // Maximum battle tokens
        self.writeVInt(20); // Tokens gained in refresh
        self.writeVInt(8640); // Tokens refresh timer
        self.writeVInt(10); // Big box star tokens
        self.writeVInt(5); // unk
        self.writeBoolean(true);
        self.writeVInt(50);
        self.writeVInt(604800);
        self.writeVInt(1); // Shop boxes enabled state

        self.writeVInt(1); // ReleaseEntry & Locked for chronos
        self.writeDataReference(16, 39);
        self.writeInt(8640)
        self.writeInt(0)

        self.writeVInt(7); // IntEntryValue array | LogicConf
        {
            self.writeLong(1, 41000000 + 15); // Theme
            self.writeLong(3, 3) // Level Required For Unlock Friendly Games
            self.writeLong(5, 0) // Temporarily Disable Shop
            self.writeLong(6, 1) // Temporarily Disable Brawl Boxes
            self.writeLong(14, 1) // Double Token Weekend
            self.writeLong(31, 1)  // Gold rush event
            self.writeLong(15, 1) // Disable Content Creator Boost
        }


        self.writeVInt(0); // Timed int value array

        self.writeVInt(0); // Unk
        // LogicConfDataEnd
    }


}

module.exports = OwnHomeDataMessage;