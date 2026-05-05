/*
 * Every 20 ticks
 */
class Poison {

    constructor(source, damage, tickCount, type) {
        this.source = source;
        this.type = type || 1;
        this.timer = 20; // Ticks between each damage application
        this.damagePerTick = Math.floor(damage / (tickCount || 4));
        this.tickCount = tickCount || 4;
    }


    refresh(source, damage, tickCount) {
        this.source = source;
        this.tickCount = tickCount;
        this.damagePerTick = Math.floor(damage / (tickCount || 4));
    }

    tick(character) {
        this.timer--;

        if (this.timer > 0) {
            return false; // Not time yet
        }

        // do damage
        if (typeof character.takeDamage === 'function') {
            character.takeDamage(this.damagePerTick);
        }

        this.timer = 20;
        this.tickCount--;

        // expired
        return this.tickCount <= 0;
    }
}

module.exports = Poison;
