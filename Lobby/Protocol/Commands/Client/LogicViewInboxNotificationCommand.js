const AvailableServerCommandMessage = require('../../Messages/Server/AvailableServerCommandMessage');

class LogicViewInboxNotificationCommand {
    decode(self) {
        self.readVInt();
        self.readVInt();
        self.readVInt();
        self.readVInt();

        this.notificationIndex = self.readVInt();
        
        self.readVInt();
    }

    async process(self) {
        console.log(`[LogicViewInboxNotificationCommand] Marking Notification Index ${this.notificationIndex} as Read`);

        let localNotifsCount = self.player.inbox ? self.player.inbox.length : 0;

        if (this.notificationIndex > 0 && this.notificationIndex <= localNotifsCount) {
            let targetIdx = this.notificationIndex - 1; 
            let notif = self.player.inbox[targetIdx];
            if (notif.IsRead) return;
            notif.IsRead = true;
            await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "inbox", self.player.inbox);
            
            let rewardGems = 0;
            if (notif.NotificationID === 85 && notif.GemsRevoked) {
                rewardGems = notif.GemsRevoked;
            } else if (notif.NotificationID === 89 && notif.GemsDonated) {
                rewardGems = notif.GemsDonated;
            }

            if (rewardGems > 0) {
                self.player.gems += rewardGems;
                await self.db.updateAccountData(self.player.high_id, self.player.low_id, "", "gems", self.player.gems);
                
                self.player.delivery_items = {
                    'Count': 1,
                    'Items': [
                        { 'Type': 100, 'Amount': rewardGems, 'DRID': 0, 'Value': 8 } 
                    ],
                    'rewardTrackType': 0,
                    'rewardForRank': 0,
                    'season': 0
                };
                
                
                new AvailableServerCommandMessage(self.client, self.player, 203, self.db).send();
            }
        }
    }
}

module.exports = LogicViewInboxNotificationCommand;