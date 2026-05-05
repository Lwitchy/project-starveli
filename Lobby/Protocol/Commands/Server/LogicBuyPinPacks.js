const PiranhaMessage = require('../../PiranhaMessage')


class LogicBuyPinPacks extends PiranhaMessage {
    constructor(client, player, db, extraData = null) {
        super()
        this.id = 24111
        this.client = client
        this.player = player
        this.db = db
    }

    async encode() {
        // Another 2022 hardcoded code, I just copy pasted because lazy to rewrite everything
        let Shelly = [152, 153, 154, 155, 210, 266]
        let Nita = [105, 106, 107, 108, 201, 257]
        let Colt = [45, 46, 47, 48, 190, 241]
        let Primo = [130, 131, 132, 133, 206, 262]
        let Bibi = [18, 19, 20, 21, 185, 236]
        let Bull = [35, 36, 37, 38, 188, 239]
        let Jessie = [89, 90, 91, 92, 198, 251]
        let Brock = [30, 31, 32, 33, 187, 238]
        let Dynamike = [60, 61, 62, 63, 193, 244]
        let Bo = [24, 25, 26, 27, 186, 237]
        let Tick = [178, 179, 180, 181, 214, 270]
        let Bit8 = [1, 2, 3, 4, 5, 182, 233]
        let Emz = [66, 67, 68, 69, 194, 245]
        let Barley = [8, 9, 10, 11, 183, 234]
        let Poco = [125, 126, 127, 128, 205, 261, 274]
        let Rosa = [141, 142, 143, 144, 208, 264]
        let Rico = [136, 137, 138, 139, 207, 263]
        let Darrly = [55, 56, 56, 57, 58, 192, 243]
        let Penny = [115, 116, 117, 118, 203, 259]
        let Carl = [40, 41, 42, 43, 189, 240, 271]
        let Jacky = [84, 85, 86, 87, 197, 250]
        let Piper = [120, 121, 122, 123, 204, 260]
        let Pam = [110, 111, 112, 113, 202, 258]
        let Frank = [71, 72, 73, 74, 195, 246]
        let Bea = [13, 14, 15, 16, 184, 235]
        let Nani = [228, 229, 230, 231, 232, 256]
        let Mortis = [100, 101, 102, 103, 200, 254]
        let Tara = [171, 172, 173, 174, 213, 269, 276]
        let Gene = [77, 78, 79, 80, 196, 249]
        let Max = [278, 279, 280, 281, 282, 253]
        let MRP = [284, 285, 286, 287, 288, 255]
        let Sprout = [165, 166, 167, 168, 212, 268]
        let Spike = [160, 161, 162, 163, 211, 267]
        let Crow = [50, 51, 52, 53, 191, 242]
        let Leon = [95, 96, 97, 98, 199, 252]
        let Sandy = [147, 148, 149, 150, 209, 265, 275]
        let Gale = [216, 217, 218, 219, 220, 247]
        let Gale_Special = [221, 222, 223, 224, 225, 226, 248]
        let Surge = [290, 291, 292, 301, 302, 303, 304]
        let Surge_Special = [293, 294, 295, 296, 297, 298, 299, 300]
        let Collete = [306, 307, 308, 309, 310, 311]
        let Collete_Special = [312, 313, 314, 315, 316, 317, 318, 319]
        let normal_pins = [6, 28, 11, 12, 93, 145, 81, 82, 22, 75, 176, 175, 156, 157, 158, 64, 169]
        let first_pins = [7, 23, 29, 34, 39, 49, 54, 59, 65, 70, 76, 83, 88, 94, 99, 109, 114, 119, 124, 135, 140, 146, 159, 164, 170, 177, 215, 227, 277, 283, 289, 305]

        const brawlerPinsMap = {
            0: Shelly, 1: Colt, 2: Bull, 3: Brock, 4: Rico, 5: Spike, 6: Barley, 7: Jessie,
            8: Nita, 9: Dynamike, 10: Primo, 11: Mortis, 12: Crow, 13: Poco, 14: Bo, 15: Piper,
            16: Pam, 17: Tara, 18: Darrly, 19: Penny, 20: Frank, 21: Gene, 22: Tick, 23: Leon,
            24: Rosa, 25: Carl, 26: Bibi, 27: Bit8, 28: Sandy, 29: Bea, 30: Emz, 31: MRP,
            32: Max, 34: Jacky, 35: Gale, 36: Nani, 37: Sprout, 38: Surge, 39: Collete
        };

        let unlockedBrawlers = this.player.unlocked_brawlers || [];
        let unlockedPins = this.player.unlocked_pins || [];

        let allValidPins = [];

        for (let brawlerId of unlockedBrawlers) {
            if (brawlerPinsMap[brawlerId]) {
                allValidPins.push(...brawlerPinsMap[brawlerId]);
            }
        }

        let lockedPins = allValidPins.filter(pin => !unlockedPins.includes(pin));

        lockedPins = [...new Set(lockedPins)];

        let selectedPins = [];
        for (let i = 0; i < 3; i++) {
            if (lockedPins.length === 0) break;

            let randomIndex = Math.floor(Math.random() * lockedPins.length);
            let chosenPin = lockedPins[randomIndex];
            selectedPins.push(chosenPin);

            lockedPins.splice(randomIndex, 1);
        }

        // GiveDelivery bytes
        this.writeVInt(203); // CommandID
        this.writeVInt(0);   // Unknown
        this.writeVInt(1);   // Multiplier
        this.writeVInt(100); // BoxID

        console.log(selectedPins)

        this.writeVInt(3)

        this.writeVInt(1); // Reward Amount
        this.writeVInt(0); // CsvId 16
        this.writeVInt(11); // Reward ID
        this.writeVInt(0); // CsvID 29
        this.writeDataReference(52, selectedPins[0]); // CsvID 52
        this.writeVInt(0); // CsvID 23
        this.writeVInt(0);


        this.writeVInt(1); // Reward Amount
        this.writeVInt(0); // CsvId 16
        this.writeVInt(11); // Reward ID
        this.writeVInt(0); // CsvID 29
        this.writeDataReference(52, selectedPins[1]); // CsvID 52
        this.writeVInt(0); // CsvID 23
        this.writeVInt(0);



        this.writeVInt(1); // Reward Amount
        this.writeVInt(0); // CsvId 16
        this.writeVInt(11); // Reward ID
        this.writeVInt(0); // CsvID 29
        this.writeDataReference(52, selectedPins[2]); // CsvID 52
        this.writeVInt(0); // CsvID 23
        this.writeVInt(0);

        this.player.unlocked_pins.push(...selectedPins);

        // Box end
        for (let i = 0; i < 13; i++) {
            this.writeVInt(0);
        }

        if (selectedPins.length > 0) {
            await this.db.updateAccountData(this.player.high_id, this.player.low_id, "", "unlocked_pins", this.player.unlocked_pins);
        }
        console.log("Logic Buy Pin Packs")
    }
}
module.exports = LogicBuyPinPacks;