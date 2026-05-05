const LogicMath = require('../LogicMath');

class LogicGameObject {
    constructor(classId, instanceId) {
        this.classId = classId;
        this.instanceId = instanceId;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.objectIdx = -1;
        this.isRemoved = false;
    }
    tick() { }
}

class LogicItem extends LogicGameObject {
    constructor(instanceId, x, y) {
        super(18, instanceId);
        this.x = x;
        this.y = y;
        this.angle = Math.floor(Math.random() * 360);
        this.spawnTick = 0;

        this.ticksDropping = 0;
        this.dropTicks = 10;
        this.startDrop = true;
    }

    tick(battle) {
        if (this.spawnTick === 0) this.spawnTick = battle.tickCount;

        if (this.startDrop && this.ticksDropping < this.dropTicks) {
            this._tickDrop();
        } else {
            this._handleCollisions(battle);
        }
    }

    _tickDrop() {
        this.ticksDropping++;

        if (this.ticksDropping <= Math.floor(this.dropTicks / 2)) {
            this.z += 80;
        } else {
            this.z = Math.max(0, this.z - 80);
        }

        const speed = 30; 
        const dirX = LogicMath.cos(this.angle);
        const dirY = LogicMath.sin(this.angle);
        this.x += Math.floor((speed * dirX) / 1024);
        this.y += Math.floor((speed * dirY) / 1024);
    }

    _handleCollisions(battle) {
        for (const p of battle.players) {
            const player = p.player;
            if (!player || player.hp <= 0) continue;

            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 200 * 200) {
                if (typeof player.pickUpItem === 'function') {
                    player.pickUpItem(this);
                }
                this.isRemoved = true;
                break;
            }
        }
    }

    encode(bit) {
        bit.writePositiveVInt(this.x, 4);
        bit.writePositiveVInt(this.y, 4);
        bit.writePositiveVInt(102, 3);  
        bit.writePositiveVInt(this.z, 4);

        bit.writePositiveInt(10, 4);
    }
}

module.exports = { LogicItem };
