class Room {
    constructor(id) {
        this.id = id;
        this.members = []; // Array of players
    }

    addMember(player) {
        if (!this.members.includes(player)) {
            this.members.push(player);
            player.room = this;
        }
    }

    removeMember(player) {
        const index = this.members.indexOf(player);
        if (index !== -1) {
            this.members.splice(index, 1);
            player.room = null;
        }
    }

    getMembers() {
        return this.members;
    }
}

module.exports = Room;
