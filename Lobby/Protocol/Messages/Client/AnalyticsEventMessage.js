const PiranhaMessage = require('../../PiranhaMessage');


class AnalyticsEventMessage extends PiranhaMessage {
    constructor(payload, client, player){
        super(payload)
        this.id = 10110;
        this.version = 0;
        this.client = client;
        this.player = player;
    }    

    decode(){
        this.type = this.readString()
        this.event = this.readString()
    }

    process(){
        this.client.log(`[Information]: Type: "${this.type}", Event: "${this.event}"`);
    }
}
module.exports = AnalyticsEventMessage;