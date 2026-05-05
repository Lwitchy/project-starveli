// handles box rewards, took forever to get the rates right lol
// another 2022 moment, I used hardcoded values from my old server which once I spent hours to make
// because I'm lazy to read csv
const BoxConfig = {
    BoxBrawlerChance: {
        BrawlBox: 3,
        BigBox: 8,
        MegaBox: 15
    },
    RarityWeights: {
        Rare: 700,
        SuperRare: 250,
        Epic: 50,
        Mythic: 10,
        Legendary: 3
    },
    Brawlers: {
        Rare: [10, 13, 24, 6],
        SuperRare: [34, 4, 18, 19, 25],
        Epic: [20, 29, 16, 15, 36, 26, 35],
        Mythic: [32, 21, 17, 11, 31, 38, 37],
        Legendary: [5, 12, 23, 28, 39]
    },
    Gadgets: {
        "0": 255, "1": 273, "2": 272, "3": 245, "4": 246, "5": 247, "6": 250, "7": 251, "8": 249, "9": 258,
        "10": 264, "11": 265, "12": 243, "13": 267, "14": 263, "15": 268, "16": 257, "17": 266, "18": 260,
        "19": 248, "20": 261, "21": 252, "22": 253, "23": 276, "24": 242, "25": 262, "26": 275, "27": 259,
        "28": 270, "29": 271, "30": 274, "31": 269, "32": 254, "34": 256, "35": 277, "36": 278, "37": 244,
        "38": 285, "39": 302
    },
    StarPowers: {
        "0": 76, "1": 77, "2": 78, "3": 79, "4": 80, "5": 81, "6": 82, "7": 83, "8": 84, "9": 85, "10": 86,
        "11": 87, "12": 88, "13": 89, "14": 90, "15": 91, "16": 92, "17": 93, "18": 94, "19": 99, "20": 104,
        "21": 109, "22": 114, "23": 119, "24": 124, "25": 129, "26": 134, "27": 168, "28": 186, "29": 192,
        "30": 198, "31": 204, "32": 210, "34": 222, "35": 228, "36": 234, "37": 240, "38": 283, "39": 300
    }
};

class LogicBoxData {
    constructor(player) {
        this.player = player
        this.player.playerSkills = this.player.playerSkills || []
    }

    rng(min, max) {
        return Math.floor(Math.random() * (max - min) + min)
    }

    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)]
    }

    getUnownedBrawlers() {
        let all = global.allBrawlers || []
        let have = this.player.unlocked_brawlers || []
        return all.filter(b => !have.includes(b))
    }

    unlockBrawler(id) {
        if (!this.player.unlocked_brawlers.includes(id))
            this.player.unlocked_brawlers.push(id)
    }

    rollNewBrawler() {
        let locked = this.getUnownedBrawlers()
        if (locked.length === 0) return null

        let rarities = [
            { brawlers: BoxConfig.Brawlers.Rare, weight: BoxConfig.RarityWeights.Rare },
            { brawlers: BoxConfig.Brawlers.SuperRare, weight: BoxConfig.RarityWeights.SuperRare },
            { brawlers: BoxConfig.Brawlers.Epic, weight: BoxConfig.RarityWeights.Epic },
            { brawlers: BoxConfig.Brawlers.Mythic, weight: BoxConfig.RarityWeights.Mythic },
            { brawlers: BoxConfig.Brawlers.Legendary, weight: BoxConfig.RarityWeights.Legendary }
        ]

        let availableRarities = []
        let totalWeight = 0;

        for (let r of rarities) {
            let availableInRarity = locked.filter(b => r.brawlers.includes(b))
            if (availableInRarity.length > 0) {
                availableRarities.push({
                    brawlers: availableInRarity,
                    weight: r.weight
                })
                totalWeight += r.weight;
            }
        }

        if (availableRarities.length === 0) {
            return this.pickRandom(locked)
        }

        let rnd = Math.random() * totalWeight;
        for (let r of availableRarities) {
            if (rnd < r.weight) {
                return this.pickRandom(r.brawlers)
            }
            rnd -= r.weight
        }

        return this.pickRandom(availableRarities[availableRarities.length - 1].brawlers)
    }

    getEligiblePPBrawlers() {
        let myBrawlers = this.player.unlocked_brawlers || [];
        return myBrawlers.filter(b => (this.player.brawlersPowerLevel[b.toString()] || 0) < 8 && (this.player.brawlersPowerPoints[b.toString()] || 0) < 1410);
    }

    addPowerPoints(brawler, amt) {
        let cur = this.player.brawlersPowerPoints[brawler.toString()] || 0
        let new_pp = cur + amt;

        let coin_bonus = 0;
        if (new_pp >= 1410) {
            coin_bonus = new_pp - 1410;
            amt = amt - coin_bonus;
            this.player.brawlersPowerPoints[brawler.toString()] = 1410;
        } else {
            this.player.brawlersPowerPoints[brawler.toString()] = new_pp;
        }

        let results = [{ Amount: amt, DRID: brawler, Value: 6, SkinID: [0, 0] }]
        if (coin_bonus > 0) {
            results.push({ Amount: coin_bonus, DRID: 0, Value: 7, SkinID: [0, 0] })
            this.player.coins += coin_bonus;
        }
        return results;
    }

    rollSkillDrops(boxChanceMultiplier, rewards) {
        let eligibleGadgets = []
        let eligibleSPs = []
        let myBrawlers = this.player.unlocked_brawlers || []

        for (let b of myBrawlers) {
            let lvl = this.player.brawlersPowerLevel[b.toString()] || 0;
            if (lvl >= 6) {
                let gId = BoxConfig.Gadgets[b.toString()]
                if (gId !== undefined && !this.player.playerSkills.includes(gId)) eligibleGadgets.push({ brawler: b, skillId: gId });
            }
            if (lvl >= 8) {
                let spId = BoxConfig.StarPowers[b.toString()]
                if (spId !== undefined && !this.player.playerSkills.includes(spId)) eligibleSPs.push({ brawler: b, skillId: spId });
            }
        }

        let gadgetChance = 40 * boxChanceMultiplier;
        let spChance = 40 * boxChanceMultiplier;

        if (eligibleGadgets.length > 0 && Math.random() * 100 < gadgetChance) {
            let chosen = this.pickRandom(eligibleGadgets);
            this.player.playerSkills.push(chosen.skillId);
            rewards.push({ Amount: 1, DRID: chosen.brawler, Value: 4, SkinID: [0, 0], SPGID: [23, chosen.skillId] });
        }

        if (eligibleSPs.length > 0 && Math.random() * 100 < spChance) {
            let chosen = this.pickRandom(eligibleSPs);
            this.player.playerSkills.push(chosen.skillId);
            rewards.push({ Amount: 1, DRID: chosen.brawler, Value: 4, SkinID: [0, 0], SPGID: [23, chosen.skillId] });
        }
    }

    randomize(boxType) {
        let rewards = []
        let eligiblePP = this.getEligiblePPBrawlers()

        if (boxType == 10) {
            let gotBrawler = false

            if (Math.random() * 100 < BoxConfig.BoxBrawlerChance.BrawlBox) {
                let b = this.rollNewBrawler()
                if (b != null) {
                    this.unlockBrawler(b)
                    rewards.push({ Amount: 1, DRID: b, Value: 1, SkinID: [0, 0] })
                    gotBrawler = true
                }
            }

            this.rollSkillDrops(0.1, rewards); // brawl box has lower skill chances ~4%? 

            if (!gotBrawler) {
                // small gold + some pp for a random brawler
                let gold = this.rng(8, 25)
                this.player.coins += gold
                rewards.push({ Amount: gold, DRID: 0, Value: 7, SkinID: [0, 0] })

                let gavePP = []
                let available = eligiblePP.filter(b => !gavePP.includes(b))
                if (available.length > 0) {
                    let b = this.pickRandom(available)
                    let pp = this.rng(10, 60)
                    let resList = this.addPowerPoints(b, pp)
                    for (let res of resList) rewards.push(res);
                }
            }

            // small chance for gems or token doublers
            if (Math.random() * 100 < 15) {
                let t = this.pickRandom([2, 8])
                let val
                if (t == 8) {
                    val = this.rng(1, 4)
                    this.player.gems += val
                } else {
                    val = this.rng(5, 15)
                    this.player.tokendoublers = (this.player.tokendoublers || 0) + val
                }
                rewards.push({ Amount: val, DRID: 0, Value: t, SkinID: [0, 0] })
            }

        } else if (boxType == 12) {
            // big box
            let gold = this.rng(20, 50)
            this.player.coins += gold
            rewards.push({ Amount: gold, DRID: 0, Value: 7, SkinID: [0, 0] })

            let ppDropCount = eligiblePP.length <= 3 ? eligiblePP.length : this.pickRandom([3, 4])
            let gavePP = []
            for (let i = 0; i < ppDropCount; i++) {
                let available = eligiblePP.filter(b => !gavePP.includes(b))
                if (available.length == 0) break
                let b = this.pickRandom(available)
                let pp = this.rng(10, 80)
                let resList = this.addPowerPoints(b, pp)
                for (let res of resList) rewards.push(res);
                gavePP.push(b)
            }

            if (Math.random() * 100 < BoxConfig.BoxBrawlerChance.BigBox) {
                let b = this.rollNewBrawler()
                if (b != null) {
                    this.unlockBrawler(b)
                    rewards.push({ Amount: 1, DRID: b, Value: 1, SkinID: [0, 0] })
                }
            }

            this.rollSkillDrops(0.4, rewards);

            if (Math.random() * 100 < 20) {
                let t = this.pickRandom([2, 8])
                let val
                if (t == 8) {
                    val = this.rng(2, 6)
                    this.player.gems += val
                } else {
                    val = this.rng(10, 25)
                    this.player.tokendoublers = (this.player.tokendoublers || 0) + val
                }
                rewards.push({ Amount: val, DRID: 0, Value: t, SkinID: [0, 0] })
            }

        } else if (boxType == 11) {
            // mega box
            let gold = this.rng(40, 100)
            this.player.coins += gold
            rewards.push({ Amount: gold, DRID: 0, Value: 7, SkinID: [0, 0] })

            // Enforced 5 PPs
            let ppDropCount = eligiblePP.length <= 5 ? eligiblePP.length : 5
            let gavePP = []
            for (let i = 0; i < ppDropCount; i++) {
                let available = eligiblePP.filter(b => !gavePP.includes(b))
                if (available.length == 0) break
                let b = this.pickRandom(available)
                let pp = this.rng(10, 60)
                let resList = this.addPowerPoints(b, pp)
                for (let res of resList) rewards.push(res);
                gavePP.push(b)
            }

            // Sixth item drops:
            if (Math.random() * 100 < BoxConfig.BoxBrawlerChance.MegaBox) {
                let b = this.rollNewBrawler()
                if (b != null) {
                    this.unlockBrawler(b)
                    rewards.push({ Amount: 1, DRID: b, Value: 1, SkinID: [0, 0] })
                }
            }

            this.rollSkillDrops(1, rewards);

            if (Math.random() * 100 < 25) {
                let t = this.pickRandom([2, 8])
                let val
                if (t == 8) {
                    val = this.rng(3, 9)
                    this.player.gems += val
                } else {
                    val = this.rng(15, 40)
                    this.player.tokendoublers = (this.player.tokendoublers || 0) + val
                }
                rewards.push({ Amount: val, DRID: 0, Value: t, SkinID: [0, 0] })
            }
        }

        return { Rewards: rewards }
    }
}

module.exports = LogicBoxData
