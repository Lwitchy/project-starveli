const LogicMath = require('../LogicMath');
const { LogicProjectile } = require('./LogicProjectile');

class LogicCharacter {
    constructor(player, battleData, tickDurationMs = 50) {
        this.player = player;
        this.battleData = battleData;
        this.tickDurationMs = tickDurationMs;


        const maxBars = battleData.maxCharge || 3;
        this.maxAmmo = maxBars * 1000;
        this.ammo = this.maxAmmo;
        this.updateTickRate(tickDurationMs);

        this.isFiring = false;
        this.burstShotsLeft = 0;
        this.nextShotTick = 0;
        this.lastAngle = 0;
        this.ticksActive = 0;
    }

    updateTickRate(tickDurationMs = this.tickDurationMs) {
        this.tickDurationMs = tickDurationMs > 0 ? tickDurationMs : 50;

        const rechargeTime = this.battleData.rechargeTime || 2000;
        this.ammoGainPerTick = Math.floor(1000 / (rechargeTime / this.tickDurationMs));
    }

    encode(bit, isSelf = false, idx = -1) {
        const x = this.player.x;
        const y = this.player.y;
        const z = this.player.z || 0;
        const payloadIdx = (idx === -1) ? this.player.objectIdx : idx;

        bit.writePositiveVInt(x, 4);
        bit.writePositiveVInt(y, 4);
        bit.writePositiveVInt(payloadIdx, 3);
        bit.writePositiveVInt(z, 4);

        // LogicCharacter.Encode
        bit.writePositiveInt(10, 4); 

        if (isSelf) {
            bit.writePositiveInt(0, 1);
            bit.writePositiveInt(0, 1);
        } else {
            bit.writePositiveInt(this.player.angle || 0, 9);
            bit.writePositiveInt(this.player.angle || 0, 9);
        }

        bit.writePositiveInt(0, 3); 
        bit.writePositiveInt(0, 1); 
        bit.writeInt(63, 6);

        // Loops/States (Flags)
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(1, 1);
        bit.writePositiveInt(1, 1);

        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(0, 2);

        // Stats
        bit.writePositiveVInt(this.player.hp || 3200, 4);
        bit.writePositiveVInt(this.player.maxHp || 4000, 4);
        bit.writePositiveVIntMax255OftenZero(this.player.powerCubes || 0);
        bit.writePositiveVInt(0, 4); 

        bit.writePositiveInt(1, 1);
        bit.writePositiveInt(0, 1); 
        bit.writeBoolean(false);

        if (!isSelf) {
            bit.writePositiveInt(0, 1);
        }

        bit.writePositiveInt(0, 2);
        bit.writePositiveInt(0, 1);
        bit.writePositiveInt(1, 9); 

        if (isSelf) {
            bit.writePositiveInt(0, 4); 
            bit.writePositiveInt(0, 1);
            bit.writePositiveInt(0, 1);
        }
        bit.writePositiveInt(0, 5);
    }

    attack(battle, angle, targetX, targetY) {
        if (this.isFiring) return; 
        if (this.ammo < 1000) return; 

        const atk = this.battleData;
        this.ammo -= 1000;
        this.isFiring = true;
        this.burstShotsLeft = atk.shotsInBurst || 1;
        this.nextShotTick = battle.tickCount;
        this.lastAngle = angle;
        this.lastTargetX = targetX;
        this.lastTargetY = targetY;
        this.ticksActive = 1;
    }

    tick(battle) {
        if (this.ammo < this.maxAmmo) {
            this.ammo = Math.min(this.maxAmmo, this.ammo + this.ammoGainPerTick);
        }

        if (!this.isFiring) {
            this.ticksActive = 0;
            return;
        }

        this.ticksActive++;

        if (battle.tickCount >= this.nextShotTick) {
            const atk = this.battleData;
            const numBulletsPerShot = atk.numBulletsPerShot || 1;
            const spread = atk.spread || 0;

            // Spacing constants
            const muzzleOffset = 100;
            const sideSpacing = 120; // Side-by-side gap for parallel bullets (Gale)

            const dirX = LogicMath.cos(this.lastAngle);
            const dirY = LogicMath.sin(this.lastAngle);
            const sideX = -dirY; // Perpendicular vector
            const sideY = dirX;

            for (let b = 0; b < numBulletsPerShot; b++) {
                let bulletAngle = this.lastAngle;
                let lateralOffset = 0;

                if (numBulletsPerShot > 1) {
                    if (spread > 0) {
                        bulletAngle += Math.floor(-spread / 2 + (spread / (numBulletsPerShot - 1)) * b);
                    } else {
                        lateralOffset = (b - (numBulletsPerShot - 1) / 2) * sideSpacing;
                    }
                }

                if (atk.name === 'Gunslinger' || atk.name === 'GunSlinger') {
                    const currentShotIdx = (atk.shotsInBurst - this.burstShotsLeft);
                    lateralOffset += (currentShotIdx % 2 === 0 ? 1 : -1) * 25;
                }

                bulletAngle = LogicMath.normalizeAngle360(bulletAngle);
                const cubeCount = this.player.powerCubes || 0;
                const totalDamage = Math.floor(atk.damage * (1 + cubeCount * 0.1));

                const proj = new LogicProjectile(
                    atk.projectileId, this.player, bulletAngle, totalDamage, atk.castingTime,
                    this.lastTargetX, this.lastTargetY
                );

                proj.x = this.player.x + Math.floor((dirX * muzzleOffset + sideX * lateralOffset) / 1024);
                proj.y = this.player.y + Math.floor((dirY * muzzleOffset + sideY * lateralOffset) / 1024);

                proj.objectIdx = battle.objectReferenceSeed++;
                battle.gameObjects.push(proj);
            }

            this.burstShotsLeft--;
            if (this.burstShotsLeft <= 0) {
                this.isFiring = false;
            } else {
                const ticksToWait = Math.max(1, Math.floor((atk.msBetweenAttacks || 100) / this.tickDurationMs));
                this.nextShotTick = battle.tickCount + ticksToWait;
            }
        }
    }
}

module.exports = LogicCharacter;
