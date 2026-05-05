const PiranhaMessage = require('../../PiranhaMessage');

class BattleEndMessage extends PiranhaMessage {
    constructor(client, player, database) {
        super()
        this.id = 23456;
        this.client = client;
        this.player = player;
        this.db = database;
    }

    encode() {
        let data = this.player.battle_data || {};
        let players = data['players'] || {};
        let player1_brawler = players['player_1_brawler'] || 0;
        let player1_skin = players['player_1_skin'] || 0;
        let player1_name = players['player_1_name'] || "witchyy";


        let brawler_trophies = this.player.brawlersTrophies[player1_brawler] || 0;
        let brawlerHigh_trophies = this.player.brawlersHighestTrophies[player1_brawler] || 0;
        let type = 0;
        // Earned Rewards
        let win_val = 0;
        let lose_val = 0;
        // Earned Rewards Showdown
        let rank_1_val = 0;
        let rank_2_val = 0;
        let rank_3_val = 0;
        let rank_4_val = 0;
        let rank_5_val = 0;
        let rank_6_val = 0;
        let rank_7_val = 0;
        let rank_8_val = 0;
        let rank_9_val = 0;
        let rank_10_val = 0;

        // Structure of Battle end
        if (data['playersCount'] === 10 && players['player_2_team'] == 0) {
            type = 5
        } else if (data['playersCount'] === 10) {
            type = 2
        } else if (data['playersCount'] === 3 && [27, 29, 39, 68].includes(data['map'])) {
            type = 3
        } else if (data['playersCount'] === 3 && [57, 67, 133].includes(data['map'])) {
            type = 6
        } else if (data['playersCount'] === 6 && [97, 98, 99, 127, 128, 129, 130, 131, 141, 142].includes(data['map'])) {
            type = 3
        } else if (data['playersCount'] === 6 && [21, 30, 65, 66, 119, 120].includes(data['map'])) {
            type = 4
        } else {
            type = 1
        }

        if (type === 1) {
            // 3v3 matches
            if (0 <= brawler_trophies && brawler_trophies <= 49) {
                win_val = 8; lose_val = 0;
            } else if (50 <= brawler_trophies && brawler_trophies <= 99) {
                win_val = 8; lose_val = -1;
            } else if (100 <= brawler_trophies && brawler_trophies <= 199) {
                win_val = 8; lose_val = -2;
            } else if (200 <= brawler_trophies && brawler_trophies <= 299) {
                win_val = 8; lose_val = -3;
            } else if (300 <= brawler_trophies && brawler_trophies <= 399) {
                win_val = 8; lose_val = -4;
            } else if (400 <= brawler_trophies && brawler_trophies <= 499) {
                win_val = 8; lose_val = -5;
            } else if (500 <= brawler_trophies && brawler_trophies <= 599) {
                win_val = 8; lose_val = -6;
            } else if (600 <= brawler_trophies && brawler_trophies <= 699) {
                win_val = 8; lose_val = -7;
            } else if (700 <= brawler_trophies && brawler_trophies <= 799) {
                win_val = 8; lose_val = -8;
            } else if (800 <= brawler_trophies && brawler_trophies <= 899) {
                win_val = 7; lose_val = -9;
            } else if (900 <= brawler_trophies && brawler_trophies <= 999) {
                win_val = 6; lose_val = -10;
            } else if (1000 <= brawler_trophies && brawler_trophies <= 1099) {
                win_val = 5; lose_val = -11;
            } else if (1100 <= brawler_trophies && brawler_trophies <= 1199) {
                win_val = 4; lose_val = -12;
            } else {
                win_val = 3; lose_val = -12;
            }
        } else if (type === 2 || type === 5) {
            if (0 <= brawler_trophies && brawler_trophies <= 49) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 7; rank_4_val = 6; rank_5_val = 4; rank_6_val = 2; rank_7_val = 2; rank_8_val = 1; rank_9_val = 0; rank_10_val = 0;
            } else if (50 <= brawler_trophies && brawler_trophies <= 99) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 7; rank_4_val = 6; rank_5_val = 3; rank_6_val = 2; rank_7_val = 2; rank_8_val = 0; rank_9_val = -1; rank_10_val = -2;
            } else if (100 <= brawler_trophies && brawler_trophies <= 199) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 7; rank_4_val = 6; rank_5_val = 3; rank_6_val = 1; rank_7_val = 0; rank_8_val = -1; rank_9_val = -2; rank_10_val = -2;
            } else if (200 <= brawler_trophies && brawler_trophies <= 299) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 6; rank_4_val = 5; rank_5_val = 3; rank_6_val = 1; rank_7_val = 0; rank_8_val = -2; rank_9_val = -3; rank_10_val = -3;
            } else if (300 <= brawler_trophies && brawler_trophies <= 399) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 6; rank_4_val = 5; rank_5_val = 2; rank_6_val = 0; rank_7_val = 0; rank_8_val = -3; rank_9_val = -4; rank_10_val = -4;
            } else if (400 <= brawler_trophies && brawler_trophies <= 499) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 6; rank_4_val = 5; rank_5_val = 2; rank_6_val = -1; rank_7_val = -2; rank_8_val = -3; rank_9_val = -5; rank_10_val = -5;
            } else if (500 <= brawler_trophies && brawler_trophies <= 599) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 6; rank_4_val = 4; rank_5_val = 2; rank_6_val = -1; rank_7_val = -2; rank_8_val = -5; rank_9_val = -6; rank_10_val = -6;
            } else if (600 <= brawler_trophies && brawler_trophies <= 699) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 6; rank_4_val = 4; rank_5_val = 1; rank_6_val = -2; rank_7_val = -2; rank_8_val = -5; rank_9_val = -7; rank_10_val = -8;
            } else if (700 <= brawler_trophies && brawler_trophies <= 799) {
                rank_1_val = 10; rank_2_val = 8; rank_3_val = 6; rank_4_val = 4; rank_5_val = 1; rank_6_val = -3; rank_7_val = -4; rank_8_val = -5; rank_9_val = -8; rank_10_val = -9;
            } else if (800 <= brawler_trophies && brawler_trophies <= 899) {
                rank_1_val = 9; rank_2_val = 7; rank_3_val = 5; rank_4_val = 2; rank_5_val = 0; rank_6_val = -3; rank_7_val = -4; rank_8_val = -7; rank_9_val = -9; rank_10_val = -10;
            } else if (900 <= brawler_trophies && brawler_trophies <= 999) {
                rank_1_val = 8; rank_2_val = 6; rank_3_val = 4; rank_4_val = 1; rank_5_val = -1; rank_6_val = -3; rank_7_val = -6; rank_8_val = -8; rank_9_val = -10; rank_10_val = -11;
            } else if (1000 <= brawler_trophies && brawler_trophies <= 1099) {
                rank_1_val = 6; rank_2_val = 5; rank_3_val = 3; rank_4_val = 1; rank_5_val = -2; rank_6_val = -5; rank_7_val = -6; rank_8_val = -9; rank_9_val = -11; rank_10_val = -12;
            } else if (1100 <= brawler_trophies && brawler_trophies <= 1199) {
                rank_1_val = 5; rank_2_val = 4; rank_3_val = 1; rank_4_val = 0; rank_5_val = -2; rank_6_val = -6; rank_7_val = -7; rank_8_val = -10; rank_9_val = -12; rank_10_val = -13;
            } else {
                rank_1_val = 5; rank_2_val = 3; rank_3_val = 0; rank_4_val = -1; rank_5_val = -2; rank_6_val = -6; rank_7_val = -8; rank_8_val = -11; rank_9_val = -12; rank_10_val = -13;
            }
        }

        if (type === 2 || type === 5) {
            if (data.battle_result === 1) win_val = rank_1_val, lose_val = rank_1_val;
            if (data.battle_result === 2) win_val = rank_2_val, lose_val = rank_2_val;
            if (data.battle_result === 3) win_val = rank_3_val, lose_val = rank_3_val;
            if (data.battle_result === 4) win_val = rank_4_val, lose_val = rank_4_val;
            if (data.battle_result === 5) win_val = rank_5_val, lose_val = rank_5_val;
            if (data.battle_result === 6) win_val = rank_6_val, lose_val = rank_6_val;
            if (data.battle_result === 7) win_val = rank_7_val, lose_val = rank_7_val;
            if (data.battle_result === 8) win_val = rank_8_val, lose_val = rank_8_val;
            if (data.battle_result === 9) win_val = rank_9_val, lose_val = rank_9_val;
            if (data.battle_result === 10) win_val = rank_10_val, lose_val = rank_10_val;
        }

        let trophies_result = 0;
        if (type === 2 || type === 5) {
            trophies_result = win_val; // For showdown, win_val is set to rank_X_val which is the exact trophies change
        } else {
            if (data.battle_result === 1) {
                trophies_result = lose_val; // Defeat
            } else if (data.battle_result === 0) { // Victory
                trophies_result = win_val;
            } else if (data.battle_result === 2) { // Draw
                trophies_result = 0;
            }
        }

        this.player.trophies += trophies_result;
        this.player.brawlersTrophies[player1_brawler] += trophies_result;
        this.player.trophy_animation = trophies_result;

        if (this.player.trophies < 0) this.player.trophies = 0;
        if (this.player.brawlersTrophies[player1_brawler] < 0) this.player.brawlersTrophies[player1_brawler] = 0;

        if (this.player.trophies > this.player.highest_trophies) {
            this.player.highest_trophies = this.player.trophies;
        }

        if (this.player.brawlersTrophies[player1_brawler] > this.player.brawlersHighestTrophies[player1_brawler]) {
            this.player.brawlersHighestTrophies[player1_brawler] = this.player.brawlersTrophies[player1_brawler];
        }

        this.db.updateAccountData(this.player.high_id, this.player.low_id, "", 'trophies', this.player.trophies);
        this.db.updateAccountData(this.player.high_id, this.player.low_id, "", 'highest_trophies', this.player.highest_trophies);
        this.db.updateAccountData(this.player.high_id, this.player.low_id, "", 'brawlersTrophies', this.player.brawlersTrophies);
        this.db.updateAccountData(this.player.high_id, this.player.low_id, "", 'brawlersHighestTrophies', this.player.brawlersHighestTrophies);

        this.writeVInt(type); //2 = Showdown, 3 = Robo Rumble, 4 = Big Game, 5 = Duo Showdown, 6 = Boss Fight/Super City Rampage. Else is 3vs3
        this.writeVInt(data.battle_result !== undefined ? data.battle_result : 1); //# Result (Victory/Defeat/Draw/Rank Score)
        this.writeVInt(0); // Tokens Gained
        this.writeVInt(trophies_result); //Trophies Result
        this.writeVInt(0); //Power Play Points Gained
        this.writeVInt(0); //Doubled Tokens
        this.writeVInt(0); //Double Token Event
        this.writeVInt(0); //Token Doubler Remaining
        this.writeVInt(0); //Robo Rumble/Boss Fight/Super City Rampage Level Passed
        this.writeVInt(0); //Epic Win Power Play Points Gained
        this.writeVInt(0); //Championship Level Passed
        this.writeVInt(0); //Challenge Reward Type (0 = Star Points, 1 = Star Tokens)
        this.writeVInt(0); //Challenge Reward Ammount
        this.writeVInt(0); //Championship Losses Left
        this.writeVInt(0); //Championship Maximun Losses
        this.writeVInt(0); //Coin Shower Event
        this.writeVInt(0); //Underdog Trophies
        this.writeByte(16); // Battle Result Type ((-16)-(-1) = Power Play Battle End, 0-15 = Practice and Championship Battle End, 16-31 = Matchmaking Battle End, 32-47 = Friendly Game Battle End, 48-63  = Spectate and Replay Battle End, 64-79 = Championship Battle End)
        this.writeVInt(-1); // Championship Challenge Type
        this.writeVInt(1); // Championship Cleared


        this.writeVInt(6);
        {
            this.writeVInt(1); //Player Team and Star Player Type

            this.writeDataReference(16, player1_brawler);
            this.writeDataReference(29, player1_skin);


            this.writeVInt(this.player.brawlersTrophies[player1_brawler]); // brawler trophies
            this.writeVInt(0); // power play related
            this.writeVInt(this.player.brawlersPowerLevel[player1_brawler]); // power level brawler

            this.writeBoolean(true);
            this.writeInt(0);
            this.writeInt(1);

            this.writeString(player1_name);
            this.writeVInt(0); // Player Experience Level
            this.writeVInt(28000000); // Profile Icon
            this.writeVInt(43000000 + 1); // name color
            this.writeVInt(42000000 + 1); // bpnamecolor

            console.log("Player 1 Data: ", player1_brawler, player1_skin, player1_name)

            if (players['player_1_team'] === 0) {
                if (players['player_2_team'] === 0) {
                    this.writeVInt(0);
                } else {
                    this.writeVInt(2)
                }
            } else {
                if (players['player_2_team'] === 0) {
                    this.writeVInt(2)
                } else {
                    this.writeVInt(0)
                }
            }

            this.writeDataReference(16, players['player_2_brawler']) // Player Brawler
            this.writeVInt(0) // Player Skin
            this.writeVInt(0) // Brawler Trophies
            this.writeVInt(0) // Player Power Play Points
            this.writeVInt(0) // Brawler Power Level
            this.writeBoolean(false) // Player HighID and LowID Array
            this.writeString(players['player_2_name']) // Player Name
            this.writeVInt(0) // Player Experience Level   
            this.writeVInt(28000000); // Profile Icon
            this.writeVInt(43000000 + 1); // name color
            this.writeVInt(42000000 + 1); // bpnamecolor        


            if (players['player_1_team'] === 0) {
                if (players['player_3_team'] === 0) {
                    this.writeVInt(0);
                } else {
                    this.writeVInt(2)
                }
            } else {
                if (players['player_3_team'] === 0) {
                    this.writeVInt(2)
                } else {
                    this.writeVInt(0)
                }
            }

            this.writeDataReference(16, players['player_3_brawler']) // Player Brawler
            this.writeVInt(0) // Player Skin
            this.writeVInt(0) // Brawler Trophies
            this.writeVInt(0) // Player Power Play Points
            this.writeVInt(0) // Brawler Power Level
            this.writeBoolean(false) // Player HighID and LowID Array
            this.writeString(players['player_3_name']) // Player Name
            this.writeVInt(0) // Player Experience Level   
            this.writeVInt(28000000); // Profile Icon
            this.writeVInt(43000000 + 1); // name color
            this.writeVInt(42000000 + 1); // bpnamecolor   

            if (players['player_1_team'] === 0) {
                if (players['player_4_team'] === 0) {
                    this.writeVInt(0);
                } else {
                    this.writeVInt(2)
                }
            } else {
                if (players['player_4_team'] === 0) {
                    this.writeVInt(2)
                } else {
                    this.writeVInt(0)
                }
            }

            this.writeDataReference(16, players['player_4_brawler']) // Player Brawler
            this.writeVInt(0) // Player Skin
            this.writeVInt(0) // Brawler Trophies
            this.writeVInt(0) // Player Power Play Points
            this.writeVInt(0) // Brawler Power Level
            this.writeBoolean(false) // Player HighID and LowID Array
            this.writeString(players['player_4_name']) // Player Name
            this.writeVInt(0) // Player Experience Level   
            this.writeVInt(28000000); // Profile Icon
            this.writeVInt(43000000 + 1); // name color
            this.writeVInt(42000000 + 1); // bpnamecolor   


            if (players['player_1_team'] === 0) {
                if (players['player_5_team'] === 0) {
                    this.writeVInt(0);
                } else {
                    this.writeVInt(2)
                }
            } else {
                if (players['player_5_team'] === 0) {
                    this.writeVInt(2)
                } else {
                    this.writeVInt(0)
                }
            }
            this.writeDataReference(16, players['player_5_brawler']) // Player Brawler
            this.writeVInt(0) // Player Skin
            this.writeVInt(0) // Brawler Trophies
            this.writeVInt(0) // Player Power Play Points
            this.writeVInt(0) // Brawler Power Level
            this.writeBoolean(false) // Player HighID and LowID Array
            this.writeString(players['player_5_name']) // Player Name
            this.writeVInt(0) // Player Experience Level   
            this.writeVInt(28000000); // Profile Icon
            this.writeVInt(43000000 + 1); // name color
            this.writeVInt(42000000 + 1); // bpnamecolor   

            if (players['player_1_team'] === 0) {
                if (players['player_6_team'] === 0) {
                    this.writeVInt(0);
                } else {
                    this.writeVInt(2)
                }
            } else {
                if (players['player_6_team'] === 0) {
                    this.writeVInt(2)
                } else {
                    this.writeVInt(0)
                }
            }

            this.writeDataReference(16, players['player_6_brawler']) // Player Brawler
            this.writeVInt(0) // Player Skin
            this.writeVInt(0) // Brawler Trophies
            this.writeVInt(0) // Player Power Play Points
            this.writeVInt(0) // Brawler Power Level
            this.writeBoolean(false) // Player HighID and LowID Array
            this.writeString(players['player_6_name']) // Player Name
            this.writeVInt(0) // Player Experience Level   
            this.writeVInt(28000000); // Profile Icon
            this.writeVInt(43000000 + 1); // name color
            this.writeVInt(42000000 + 1); // bpnamecolor   
            console.log("Player Data: ", player1_brawler, player1_skin, player1_name, players['player_2_brawler'], players['player_2_skin'], players['player_2_name'], players['player_3_brawler'], players['player_3_skin'], players['player_3_name'], players['player_4_brawler'], players['player_4_skin'], players['player_4_name'], players['player_5_brawler'], players['player_5_skin'], players['player_5_name'], players['player_6_brawler'], players['player_6_skin'], players['player_6_name'])

        }

        this.writeVInt(2); // exp array
        {
            this.writeVInt(0);
            this.writeVInt(0); // exp
            this.writeVInt(8);
            this.writeVInt(0); // trophui
        }

        this.writeVInt(0); // bonus array

        this.writeVInt(2); // bars array
        {
            this.writeVInt(1);
            this.writeVInt(this.player.brawlersTrophies[player1_brawler] - trophies_result); // current value
            this.writeVInt(0);

            this.writeVInt(5);
            this.writeVInt(0);
            this.writeVInt(0);
        }

        this.writeVInt(28);
        this.writeVInt(0);

        this.writeBoolean(true); // Play Again

        this.writeVInt(0);
        this.writeVInt(0);
        this.writeVInt(0);
        this.writeVInt(0);
    }
}
module.exports = BattleEndMessage