const LogicMath = require('../LogicMath');

class LogicAreaEffect {

    constructor(instanceId, owner, damage) {
        this.classId = 17; // AreaEffect
        this.instanceId = instanceId;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.objectIdx = -1;
        this.isRemoved = false;

        this.owner = owner;
        this.damage = damage;
        this.ticksElapsed = 0;
        this.alreadyDamagedIds = [];

        this.effectData = (global.areaEffectData && global.areaEffectData[instanceId]) || {};
        if (!this.effectData.type) this.effectData.type = 'Damage';
        if (!this.effectData.radius) this.effectData.radius = 300;
        if (!this.effectData.timeMs) this.effectData.timeMs = 1000;

        if (this.damage === 0 && this.effectData.damage > 0) {
            this.damage = this.effectData.damage;
        }
    }

    tick(battle) {
        if (this.isRemoved) return;

        this.ticksElapsed++;

        const maxTicks = Math.floor(this.effectData.timeMs / 50);
        if (this.ticksElapsed >= maxTicks) {
            this._onDestroy(battle);
            this.isRemoved = true;
            return;
        }

        const type = this.effectData.type;

        if (type === 'Damage') {
            this._damageTargetsInRadius(battle);
        } else if (type === 'Dot') {
            if (this.ticksElapsed % 20 === 0) {
                this.alreadyDamagedIds = [];
            }
            this._damageTargetsInRadius(battle);
        } else if (type === 'BulletExplosion') {
            if (this.ticksElapsed === 1) {
                this._spawnBulletExplosion(battle);
            }
        }
    }

    _damageTargetsInRadius(battle) {
        if (!battle || !battle.players) return;

        const radius = this.effectData.radius;
        const radiusSq = radius * radius;

        for (const p of battle.players) {
            const obj = p.player;
            if (obj === this.owner) continue;
            if (obj.isRemoved) continue;
            if (this.alreadyDamagedIds.includes(obj.objectIdx)) continue;

            const dx = obj.x - this.x;
            const dy = obj.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= radiusSq) {
                if (typeof obj.takeDamage === 'function') {
                    obj.takeDamage(this.damage);
                }
                this.alreadyDamagedIds.push(obj.objectIdx);
            }
        }

        // Also check non-player game objects (boxes etc.)
        if (battle.gameObjects) {
            for (const obj of battle.gameObjects) {
                if (!obj || obj === this.owner || obj.classId === 6 || obj.classId === 17) continue;
                if (obj.isRemoved) continue;
                if (this.alreadyDamagedIds.includes(obj.objectIdx)) continue;
                if (typeof obj.takeDamage !== 'function') continue;

                const dx = obj.x - this.x;
                const dy = obj.y - this.y;
                const distSq = dx * dx + dy * dy;

                if (distSq <= radiusSq) {
                    obj.takeDamage(this.damage);
                    this.alreadyDamagedIds.push(obj.objectIdx);
                }
            }
        }
    }

    _spawnBulletExplosion(battle) {
        const count = this.effectData.customValue || 6;
        const bulletName = this.effectData.bulletExplosionBullet;
        const bulletDistance = this.effectData.bulletExplosionBulletDistance || 12;

        if (!bulletName || !global.areaEffectByName) return;

        let projInstanceId = 0;
        if (global.projDataById) {
            for (const [id, data] of Object.entries(global.projDataById)) {
                if (data.name === bulletName) {
                    projInstanceId = parseInt(id);
                    break;
                }
            }
        }

        const { LogicProjectile } = require('./LogicProjectile');
        let angleStep = Math.floor(360 / count);
        let currentAngle = 0;

        for (let i = 0; i < count; i++) {
            const proj = new LogicProjectile(
                projInstanceId,
                this.owner,
                currentAngle,
                this.damage,
                Math.floor(bulletDistance / 2)
            );
            proj.x = this.x;
            proj.y = this.y;
            proj.objectIdx = battle.objectReferenceSeed++;
            battle.gameObjects.push(proj);
            currentAngle += angleStep;
        }
    }

    _onDestroy(battle) {

    }

    encode(bit) {
        bit.writePositiveVInt(this.x, 4);
        bit.writePositiveVInt(this.y, 4);
        bit.writePositiveVInt(this.objectIdx, 3);
        bit.writePositiveVInt(this.z, 4);

        const maxTicks = Math.floor(this.effectData.timeMs / 50);
        const fadeCounter = maxTicks > 0 ? Math.min(10, Math.floor((this.ticksElapsed / maxTicks) * 10)) : 3;
        bit.writePositiveInt(fadeCounter, 4);
        bit.writePositiveInt(0, 7);
    }
}

module.exports = LogicAreaEffect;
