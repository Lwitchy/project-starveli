const PiranhaMessage = require('../../PiranhaMessage');
const LogicSetPlayerNameColorCommand = require('../../Commands/Client/LogicSetPlayerNameColorCommand');
const LogicSetPlayerThumbnailCommand = require('../../Commands/Client/LogicSetPlayerThumbnailCommand');
const LogicPurchaseOfferCommand = require('../../Commands/Client/LogicPurchaseOfferCommand');
const LogicSelectSkinCommand = require('../../Commands/Client/LogicSelectSkinCommand');
const LogicClaimTailRewardCommand = require('../../Commands/Client/LogicClaimTailRewardCommand');
const LogicViewInboxNotificationCommand = require('../../Commands/Client/LogicViewInboxNotificationCommand');
const LogicClaimRankUpRewardCommand = require('../../Commands/Client/LogicClaimRankUpRewardCommand');
const LogicGatchaCommand = require('../../Commands/Client/LogicGatchaCommand');
const LogicSelectBrawlerCommand = require('../../Commands/Client/LogicSelectBrawlerCommand');
const LogicLevelUpCommand = require('../../Commands/Client/LogicLevelUpCommand');
const LogicPurchaseBrawlPass = require('../../Commands/Client/LogicPurchaseBrawlPass');
const LogicPurchaseBrawlpassProgressCommand = require('../../Commands/Client/LogicPurchaseBrawlpassProgressCommand');

class EndClientTurnMessage extends PiranhaMessage {
    constructor(payload, client, player, database) {
        super(payload)
        this.id = 14102
        this.version = 0
        this.client = client;
        this.player = player;
        this.db = database;
        this.commands = {
            500: LogicGatchaCommand,
            505: LogicSetPlayerThumbnailCommand,
            506: LogicSelectSkinCommand,
            517: LogicClaimTailRewardCommand,
            519: LogicPurchaseOfferCommand,
            520: LogicLevelUpCommand,
            525: LogicSelectBrawlerCommand,
            527: LogicSetPlayerNameColorCommand,
            528: LogicViewInboxNotificationCommand,
            534: LogicPurchaseBrawlPass,
            535: LogicClaimRankUpRewardCommand,
            536: LogicPurchaseBrawlpassProgressCommand,
        }
    }

    decode() {
        this.boolean = this.readBoolean()
        this.Tick = this.readVInt()
        this.Checksum = this.readVInt()
        this.Count = this.readVInt()
        if (this.Count >= 1) {
            for (let i = 0; i < this.Count; i++) {
                this.Command = this.readVInt()
                if (this.Command in this.commands) {
                    console.log("Command ID " + this.Command);
                    let command = new this.commands[this.Command]
                    command.decode(this)
                    command.process(this)
                } else {

                    let a = this.readVInt();
                    let b = this.readVInt();
                    let c = this.readVInt();
                    let d = this.readVInt();

                    console.log("Unhandled Command: " + this.Command + " | Sub Tick: " + a + " | Additional Field 1: " + b + " | Additional Field 2: " + c + " | Additional Field 3: " + d);

                    let fieldsToCheck = [a, b, c, d];
                    for (let field of fieldsToCheck) {
                        if (field in this.commands) {
                            console.log("!!!! Found command ID " + field + " in additional fields, processing it");
                            this.Command = field;
                            let command = new this.commands[this.Command];
                            command.decode(this);
                            command.process(this);
                            break;
                        }
                    }
                }
            }
        }


    }

    process() {
        // null lox
        return;
    }
}
module.exports = EndClientTurnMessage;