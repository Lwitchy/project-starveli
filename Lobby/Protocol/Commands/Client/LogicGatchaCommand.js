const AvailableServerCommandMessage = require("../../Messages/Server/AvailableServerCommandMessage");

class LogicGatchaCommand {
    decode(self) {
        self.readVInt()
        self.readVInt()
        self.readVInt()
        self.readVInt()
        this.box_id = self.readVInt()
        console.log("Box ID: ", this.box_id)

    }

    async process(self) {
        self.player.delivery_items = {
            'Count': 1,
            'Items': [],
            'rewardTrackType': 0,
            'rewardForRank': 0,
            'season': 0
        };

        if (this.box_id === 1) {
            // Big
            self.player.gems -= 30;
            let item = { 'Type': 12, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
            self.player.delivery_items['Items'].push(item);
            new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
        } else if (this.box_id === 3) {
            // Mega
            self.player.gems -= 80;
            let item = { 'Type': 11, 'Amount': 1, 'SkinID': [0, 0], 'DRID': 0, 'Value': 0 };
            self.player.delivery_items['Items'].push(item);
            new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
        } else {
            return;
        }


    }
}

module.exports = LogicGatchaCommand;
