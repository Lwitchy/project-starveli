const PiranhaMessage = require('../../PiranhaMessage');
const AvailableServerCommandMessage = require('../Server/AvailableServerCommandMessage');


class ChangeAvatarNameMessage extends PiranhaMessage{
    constructor(payload, client, player, database){
        super(payload)
        this.id = 10212;
        this.version = 0;
        this.client = client;
        this.player = player;
        this.db = database;
    }

    decode(){
        this.username = this.readString()
        this.state = this.readVInt()
        console.log(this.username)
    }

    async process(){
        if(this.username){
            if(this.username.length >= 2 && this.username.length <= 20){
                this.player.username = this.username;
                this.player.isRegistered = true;
                await this.db.updateAccountData(this.player.high_id, this.player.low_id, this.player.token, 'username', this.player.username);
                await this.db.updateAccountData(this.player.high_id, this.player.low_id, this.player.token, 'isRegistered', this.player.isRegistered);
                new AvailableServerCommandMessage(this.client, this.player, 201).send()
            }
        }
    }
}
module.exports = ChangeAvatarNameMessage;