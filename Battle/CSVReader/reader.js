const fs = require('fs');
const csv = require('csv');
const parse = require('./CSVParse');
const { resolve } = require('path');
const { rejects } = require('assert');
const data_locations = parse('./Assets/csv_logic/locations.csv');

class csvReader {
  readCsv(filename, isEncodeUTF = false) {
    return new Promise((resolve, reject) => {
      let rowData = [];
      let lineCount = 0;
      let stream;

      if (isEncodeUTF) {
        stream = fs.createReadStream(filename, { encoding: 'utf-8' });
      } else {
        stream = fs.createReadStream(filename);
      }

      stream.pipe(csv.parse())
        .on('data', (row) => {
          if (lineCount === 0 || lineCount === 1) {
            lineCount++;
          } else {
            rowData.push(row);
            lineCount++;
          }
        })
        .on('end', () => {
          resolve(rowData);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  loadCardID(brawlerId) {
    return new Promise((resolve, reject) => {
      let charsData, cardsData;
      this.readCsv(`./Assets/csv_logic/characters.csv`, false)
        .then((data) => {
          charsData = data;
          return this.readCsv(`./Assets/csv_logic/cards.csv`, false);
        })
        .then((data) => {
          cardsData = data;
          for (let i = 0; i < charsData.length; i++) {
            if (i == brawlerId) {
              const name = charsData[i][0];
              for (let j = 0; j < cardsData.length; j++) {
                if (cardsData[j][6].toLowerCase() == '0' && cardsData[j][3] == name) {
                  resolve(j);
                  return;
                }
              }
            }
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  loadAllBrawlers() {
    return new Promise((resolve, reject) => {
      let brawlers = [];
      this.readCsv('./Assets/csv_logic/characters.csv')
        .then((data) => {
          var charsData = data;
          for (let i = 0; i < charsData.length; i++) {
            if (charsData[i][20] == 'Hero' && charsData[i][2].toLowerCase() !== 'true' && charsData[i][1].toLowerCase() !== 'true') {
              brawlers.push(i);
            }
          }
          resolve(brawlers);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  loadAllSkins() { 
    return new Promise((resolve, reject) => {
      let skins = [];
      this.readCsv('./Assets/csv_logic/skins.csv')
        .then((skinData) => {
          for (let i = 0; i < skinData.length; i++) {
            if (!skinData[i][0].includes('Default')) {
              //console.log("DEBUG: Skin " + skinData[i][0] + " added!")
              skins.push(i);
            }
          }
          resolve(skins);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  readSkinPrices(skinID) {
    return new Promise((resolve, reject) => {
      this.readCsv('./Assets/csv_logic/skins.csv')
        .then((skinsData) => {
          for (let i = 0; i < skinsData.length; i++) {
            if (i === skinID) {
              const row = skinsData[i];
              let skincost = 0;
              let skincurrency = 0;

              if (row[7]) { // cost (Gems usually)
                skincost = parseInt(row[7], 10);
                skincurrency = 3; 
              } else if (row[8]) {
                skincost = parseInt(row[8], 10);
                skincurrency = 0;
              } else if (row[9]) {
                skincost = parseInt(row[9], 10);
                skincurrency = 1;
              }

              //console.log("DEBUG: Skin " + skinsData[i][0] + " added!")
              //console.log("DEBUG: Price " + skincost + " " + skincurrency)

              const skinInfo = {
                [skinID]: {
                  "Cost": skincost,
                  "Currency": skincurrency
                }
              };

              resolve(skinInfo);
              return;
            }
          }
          resolve(null); // Skin not found
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  readAllSkinsForBrawler(brawlerID) {
    return new Promise((resolve, reject) => {
      let charsData, skinsData, skinConfsData;
      let skinsID = [];

      this.readCsv('./Assets/csv_logic/characters.csv', false)
        .then((data) => {
          charsData = data;
          return this.readCsv('./Assets/csv_logic/skins.csv', false);
        })
        .then((data) => {
          skinsData = data;
          return this.readCsv('./Assets/csv_logic/skin_confs.csv', false);
        })
        .then((data) => {
          skinConfsData = data;

          if (brawlerID >= charsData.length) {
            resolve(skinsID);
            return;
          }

          const brawlerName = charsData[brawlerID][0];

          for (let j = 0; j < skinConfsData.length; j++) {
            if (skinConfsData[j][1] === brawlerName) {
              const skin_name = skinConfsData[j][0];

              for (let k = 0; k < skinsData.length; k++) {
                if (skinsData[k][0] === skin_name) {
                  if (!skinsData[k][0].includes('Default')) {
                    console.log("DEBUG: Skin " + skinsData[k][0] + " added! For " + brawlerName)
                    skinsID.push(k);
                  }
                }
              }
            }
          }
          resolve(skinsID);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  loadLocations() {
    let index = -1;
    let mapNumber;
    let mapName;
    let shwdwn;
    let all_maps = {
      "gemgrab_maps": [],
      "brawlball_maps": [],
      "showdown_maps": [
      ],
      "weekend_maps": [21, 30, 65, 66, 119, 120],
      "heist_maps": [],
      "siege_maps": [],
      "bounty_maps": []
    }

    return new Promise((resolve, reject) => {
      for (let i of data_locations) {
        if (i.Name !== "") {
          // Increase Index
          index++;
          if (i.Disabled !== "true") {

            // Get Gemgrab Maps!
            if (i.GameMode.includes("CoinRush")) {
              all_maps.gemgrab_maps.push(index);
            }

            // Get Showdown Maps!
            if (i.GameMode.includes("BattleRoyale")) {
              if (!i.Name.includes("Team")) {
                shwdwn = {
                  "solo": 0,
                  "duo": 1
                }

                let showdownIndex = index;
                shwdwn.solo = showdownIndex;

                mapNumber = i.Name.match(/\d+/)[0];
                mapName = `SurvivalTeam${mapNumber}`
              } else {
                if (i.Name === mapName) {
                  let showdownduoindex = index;
                  shwdwn.duo = showdownduoindex;
                  all_maps.showdown_maps.push(shwdwn);
                }
              }
            }

            if (i.Name.includes("Ball")) {
              all_maps.brawlball_maps.push(index);
            }

            /*if(i.Name.includes("BossFight")){
              all_maps.weekend_maps.push(index);
            }

            if(i.Name.includes("Biggame")){
              all_maps.weekend_maps.push(index);
            }

            if(i.Name.includes("KingOfHill")){
              all_maps.weekend_maps.push(index);
            }*/

            if (i.GameMode.includes("AttackDefend")) {
              all_maps.heist_maps.push(index);
            }

            if (i.GameMode.includes("RoboWars")) {
              all_maps.siege_maps.push(index);
            }

            if (i.GameMode.includes("BountyHunter")) {
              all_maps.bounty_maps.push(index);
            }

          }

        }
      }
      resolve(all_maps);
    });

  }



  async init() {
    {
      // Load All Brawlers
      global.allBrawlers = await this.loadAllBrawlers();

      // Load Card IDs
      global.cardIDs = {};
      for (const brawlerId of allBrawlers) {
        const cardId = await this.loadCardID(brawlerId);
        global.cardIDs[brawlerId] = cardId;
      }

      // Load Maps
      global.allMaps = await this.loadLocations();

      // Load Skins
      global.allSkins = await this.loadAllSkins();

      // Load Skin Prices
      global.skinPrices = {};
      for (const skinId of allSkins) {
        const skinPrice = await this.readSkinPrices(skinId);
        global.skinPrices[skinId] = skinPrice;
      }

      // Load All Skins For Brawler
      global.allSkinsForBrawler = {};
      for (const brawlerId of allBrawlers) {
        const skinsForBrawler = await this.readAllSkinsForBrawler(brawlerId);
        global.allSkinsForBrawler[brawlerId] = skinsForBrawler;
      }

      // Load Battle Data (per-brawler attack stats from CSVs)
      await this.loadBattleData();

      // Load Area Effect Data
      await this.loadAreaEffectData();

      console.log("DEBUG: CSVReader initialized!")
    }
  }

  async loadBattleData() {
    const charsData = await this.readCsv('./Assets/csv_logic/characters.csv', false);
    const skillsData = await this.readCsv('./Assets/csv_logic/skills.csv', false);
    const projData = await this.readCsv('./Assets/csv_logic/projectiles.csv', false);

    // Build skill lookup by name
    const skillsByName = {};
    for (const row of skillsData) {
      if (row[0]) {
        const activeTime = parseInt(row[7]) || 150;
        const msBetweenAttacks = parseInt(row[18]) || 100;
        const numBulletsPerShot = parseInt(row[21]) || 1;
        const shotsInBurst = Math.max(1, Math.floor(activeTime / msBetweenAttacks));
        const totalBullets = shotsInBurst * numBulletsPerShot;

        skillsByName[row[0]] = {
          spread: parseInt(row[19]) || 0,
          numBullets: totalBullets,
          numBulletsPerShot: numBulletsPerShot,
          shotsInBurst: shotsInBurst,
          castingRange: parseInt(row[9]) || 12,
          damage: parseInt(row[16]) || 0,
          projectileName: row[32] || '',
          rechargeTime: parseInt(row[14]) || 1500,
          maxCharge: parseInt(row[15]) || 3,
        };
      }
    }

    const projsByName = {};
    global.projDataById = {};
    for (let i = 0; i < projData.length; i++) {
      const row = projData[i];
      if (row[0]) {
        const projEntry = {
          name: row[0],
          speed: parseInt(row[2]) || 3000,
          instanceId: i,
          radius: parseInt(row[18]) || 100,
          indirect: row[19] && row[19].toLowerCase() === 'true',
          gravity: parseInt(row[23]) || 0,
          spawnAreaEffectObject: row[28] || null,
          spawnAreaEffectObject2: row[29] || null,
          isBouncing: row[35] && row[35].toLowerCase() === 'true',
          rendering: row[37] || '',
          piercesCharacters: row[38] && row[38].toLowerCase() === 'true',
          poisonDamagePercent: parseInt(row[61]) || 0,
          poisonType: parseInt(row[82]) || 0,
          chainBullets: parseInt(row[44]) || 0,
          chainSpread: parseInt(row[46]) || 0,
          chainTravelDistance: parseInt(row[47]) || 0,
          chainBullet: row[48] || null,
        };
        projsByName[row[0]] = projEntry;
        global.projDataById[i] = projEntry;
      }
    }

    global.battleData = {};
    for (let i = 0; i < charsData.length; i++) {
      const row = charsData[i];
      if (row[20] !== 'Hero') continue;
      if (row[2] && row[2].toLowerCase() === 'true') continue; 
      if (row[1] && row[1].toLowerCase() === 'true') continue; 

      const weaponName = row[4];
      const skill = skillsByName[weaponName];
      if (!skill) continue;

      const proj = projsByName[skill.projectileName] || { speed: 3000, instanceId: 0 };

      global.battleData[i] = {
        name: row[0],
        speed: parseInt(row[7]) || 720,
        hitpoints: parseInt(row[8]) || 3000,
        numBullets: skill.numBullets,
        numBulletsPerShot: skill.numBulletsPerShot,
        shotsInBurst: skill.shotsInBurst,
        msBetweenAttacks: skill.msBetweenAttacks,
        spread: skill.spread,
        castingRange: skill.castingRange,
        castingTime: Math.floor((skill.castingRange || 12) / 2) + 1,
        damage: skill.damage,
        rechargeTime: skill.rechargeTime,
        maxCharge: skill.maxCharge,
        projectileId: proj.instanceId,
        projectileSpeed: proj.speed,
      };

      console.log(`[BattleData] Brawler ${i} (${row[0]}): ${skill.numBullets} bullets (${skill.shotsInBurst}×${skill.numBulletsPerShot}), ${skill.spread}° spread, dmg=${skill.damage}, projId=${proj.instanceId}`);
    }
  }

  async loadAreaEffectData() {
    const aeData = await this.readCsv('./Assets/csv_logic/area_effects.csv', false);

    global.areaEffectData = {};
    global.areaEffectByName = {};
    for (let i = 0; i < aeData.length; i++) {
      const row = aeData[i];
      if (!row[0]) continue;
      const entry = {
        name: row[0],
        instanceId: i,
        timeMs: parseInt(row[16]) || 1000,
        radius: parseInt(row[17]) || 300,
        damage: parseInt(row[18]) || 0,
        customValue: parseInt(row[19]) || 0,
        type: row[20] || 'Damage',
        bulletExplosionBullet: row[22] || null,
        bulletExplosionBulletDistance: parseInt(row[23]) || 0,
        bulletExplosionItem: row[24] || null,
      };
      global.areaEffectData[i] = entry;
      global.areaEffectByName[row[0]] = entry;
    }
    console.log(`[BattleData] Loaded ${Object.keys(global.areaEffectData).length} area effects`);
  }
}

module.exports = csvReader;