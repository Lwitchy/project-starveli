const PiranhaMessage = require('../../PiranhaMessage');


class PlayerProfileMessage extends PiranhaMessage{
    constructor(client, player, high_id, low_id, data){
        super()
        this.id = 24113;
        this.version = 0;
        this.client = client;
        this.player = player;
        this.high_id = high_id;
        this.low_id = low_id;
        this.data = data;
    }

    encode(){
        if(this.data === null){
            this.writeLogicLong(this.player.high_id, this.player.low_id);
            this.writeDataReference(0,0);
    
            this.writeVInt(1);
            {
                this.writeDataReference(16, 0);
                this.writeDataReference(0, 0);
                this.writeVInt(0);
                this.writeVInt(0);
                this.writeVInt(0);
            }
    
            this.writeVInt(0);
    
            this.writeString("Player Profile");
            this.writeVInt(0);
            this.writeVInt(28000000);
            this.writeVInt(43000000);
    
            this.writeBoolean(false);
            this.writeVInt(0)
        }
    }
}
module.exports = PlayerProfileMessage;