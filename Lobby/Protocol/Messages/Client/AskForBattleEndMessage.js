const PiranhaMessage = require('../../PiranhaMessage');
const BattleEndMessage = require('../Server/BattleEndMessage');


class AskForBattleEndMessage extends PiranhaMessage {
    constructor(payload, client, player, database) {
        super(payload)
        this.id = 14110;
        this.client = client;
        this.player = player;
        this.db = database;
    }

    decode() {
        let data = this.player.battle_data
        data['players'] = {}

        data['battle_result'] = this.readVInt()
        this.readVInt()
        data['rank'] = this.readVInt()
        data['map'] = this.readDataReference()[1]
        data['playersCount'] = this.readVInt()

        data['players']['player_1_brawler'] = this.readDataReference()[1]
        data['players']['player_1_skin'] = this.readDataReference()[1]
        data['players']['player_1_team'] = this.readVInt()
        data['players']['player_1_unk'] = this.readVInt()
        data['players']['player_1_name'] = this.readString()

        data['players']['player_2_brawler'] = this.readDataReference()[1]
        data['players']['player_2_skin'] = this.readDataReference()[1]
        data['players']['player_2_team'] = this.readVInt()
        data['players']['player_2_unk'] = this.readVInt()
        data['players']['player_2_name'] = this.readString()

        data['players']['player_3_brawler'] = this.readDataReference()[1]
        data['players']['player_3_skin'] = this.readDataReference()[1]
        data['players']['player_3_team'] = this.readVInt()
        data['players']['player_3_unk'] = this.readVInt()
        data['players']['player_3_name'] = this.readString()

        data['players']['player_4_brawler'] = this.readDataReference()[1]
        data['players']['player_4_skin'] = this.readDataReference()[1]
        data['players']['player_4_team'] = this.readVInt()
        data['players']['player_4_unk'] = this.readVInt()
        data['players']['player_4_name'] = this.readString()

        data['players']['player_5_brawler'] = this.readDataReference()[1]
        data['players']['player_5_skin'] = this.readDataReference()[1]
        data['players']['player_5_team'] = this.readVInt()
        data['players']['player_5_unk'] = this.readVInt()
        data['players']['player_5_name'] = this.readString()

        data['players']['player_6_brawler'] = this.readDataReference()[1]
        data['players']['player_6_skin'] = this.readDataReference()[1]
        data['players']['player_6_team'] = this.readVInt()
        data['players']['player_6_unk'] = this.readVInt()
        data['players']['player_6_name'] = this.readString()

    }
    process() {
        new BattleEndMessage(this.client, this.player, this.db).send()
    }
}
module.exports = AskForBattleEndMessage;