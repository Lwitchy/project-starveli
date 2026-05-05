class LogicChangeAvatarNameCommand{
    encode(self){
        self.writeString(self.player.username);
        self.writeVInt(0);
    }
}
module.exports = LogicChangeAvatarNameCommand;