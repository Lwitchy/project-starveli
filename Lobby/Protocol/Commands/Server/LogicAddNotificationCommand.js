class LogicAddNotificationCommand {
    encode(self) {
        let notif = self.extraData;
        if (!notif) return;

        self.writeVInt(1); // Notifications array count
        
        let notifId = notif.NotificationID || 81;
        self.writeVInt(notifId); // Notification ID
        
        // Index of the new notification
        let nId = self.player.inbox ? self.player.inbox.length : 1;
        self.writeInt(nId); // Notification Index
        
        let isRead = notif.IsRead || false;
        self.writeBoolean(isRead); // Notification Read
        self.writeInt(Math.floor(Date.now() / 1000) - (notif.Timer || Math.floor(Date.now() / 1000))); // Notification Time Ago
        self.writeString(notif.Message || ""); // Notification Message Entry
        
        if (notifId === 81 || notifId === 82) { 
            // Support Message or Club Mail
            self.writeVInt(0); 
        } else if (notifId === 83) {
            // Promo Popup
            self.writeString(notif.PrimaryText || ""); // Primary Text Entry
            self.writeString(notif.SecondaryText || ""); // Secondary Text Entry
            self.writeString(notif.ButtonText || ""); // Button Text Entry
            self.writeString(notif.BannerFile || ""); // File Name
            self.writeString(notif.BannerHash || ""); // Hash
            self.writeStringReference(notif.EventLink || ""); // Event Link
            self.writeVInt(0);
        } else if (notifId === 85) {
            // Gems Refunded
            self.writeVInt(0); // Revoke Type
            self.writeVInt(notif.GemsRevoked || 0); // Gems Revoked
            self.writeLong(0, 1); // Player ID
            self.writeVInt(0);
            self.writeString("");
        } else if (notifId === 87) {
            // News
            self.writeStringReference(notif.NewsLink || "");
        } else if (notifId === 89) {
            // Gems Donated
            self.writeVInt(0);
            self.writeVInt(notif.GemsDonated || 0); // Gems Donated
        } else if (notifId === 92) {
            // Brawler Power Points Donated
            self.writeVInt(0);
            self.writeVInt(notif.BrawlerID || 0); // Brawler ID
            self.writeVInt(notif.PowerPoints || 0); // Power Points Donated
        } else if (notifId === 93) {
            // Brawler Donated
            self.writeVInt(0); 
            self.writeVInt(notif.BrawlerID || 0); // Brawler Donated
        } else if (notifId === 94) {
            // Skin Donated
            self.writeVInt(notif.SkinID || 0); // Skin Donated
        } else {
            self.writeVInt(0);
        }
    }
}

module.exports = LogicAddNotificationCommand;
