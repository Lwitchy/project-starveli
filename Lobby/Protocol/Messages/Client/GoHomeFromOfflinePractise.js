const PiranhaMessage = require("../../PiranhaMessage");
const OwnHomeDataMessage = require("../Server/OwnHomeDataMessage");


class GoHomeFromOfflinePractiseMessage extends PiranhaMessage{
    constructor(payload, client, player){
        super(payload)
        this.id = 14109;
        this.version = 0;
        this.client = client;
        this.player = player;
    }

    decode(){}

    process(){
        new OwnHomeDataMessage(this.client, this.player).send()
    }
}
module.exports = GoHomeFromOfflinePractiseMessage;