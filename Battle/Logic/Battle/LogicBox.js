const { LogicItem } = require('./LogicItem');

class LogicBox {
    constructor(instanceId, x, y) {
        this.classId = 16; 
        this.instanceId = 51;
        this.x = x;
        this.y = y;
        this.z = 0;
        this.hp = 6000;
        this.maxHp = 6000;
        this.objectIdx = -1;
        this.isRemoved = false;

        this.destroyedTicks = 0;
        this.isDead = false;
    }

    tick(battle) {
        if (this.isRemoved) return;

        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            console.log(`[Battle] Box at ${this.x},${this.y} was destroyed! Spawning Power Cube...`);

            const cube = new LogicItem(9, this.x, this.y);
            cube.objectIdx = battle.objectReferenceSeed++;
            battle.gameObjects.push(cube);
        }

        if (this.isDead) {
            this.destroyedTicks++;
            if (this.destroyedTicks > 2) {
                this.isRemoved = true;
            }
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp = Math.max(0, this.hp - amount);
    }

    encode(bit) {
        bit.writePositiveVInt(this.x, 4);
        bit.writePositiveVInt(this.y, 4);
        bit.writePositiveVInt(170, 3);  
        bit.writePositiveVInt(this.z, 4);

        bit.writePositiveInt(10, 4); // Visibility
        bit.writePositiveInt(0, 3);
        bit.writePositiveInt(1, 1); 
        bit.writePositiveInt(1, 1);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 2);

        // Health
        bit.writePositiveVInt(this.hp, 4);
        bit.writePositiveVInt(this.maxHp, 4);

        // Final fields
        bit.writePositiveInt(0, 2); 
        bit.writePositiveInt(0, 1);  
        bit.writePositiveInt(0, 9); 
        bit.writePositiveInt(0, 5);
    }
}

module.exports = { LogicBox };
