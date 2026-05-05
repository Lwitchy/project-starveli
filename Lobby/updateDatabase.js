const mongoose = require('mongoose');

let PlayerDataStructure = {
    'username': "Player",
    'isRegistered': false,
    'trophies': 0,
    'highest_trophies': 0,
    'collected_trophyroadRewards': 1,
    'experiencePoints': 0,
    'thumbnail': 0,
    'name_color': 0,
    'selectedSkins': {},
    'unlocked_skins': [],
    'namechangeCost': 0,
    'namechangeExist': 0,
    'offers': [],
    'home_brawler': 0,
    'playerRegion': "AZ",
    'playerContentCreator': "Tara's Brawl",
    'brawlPass': [],
    'quests': [],
    'inbox': [],
    'unlocked_brawlers': [],
    'brawlersTrophies': {},
    'brawlersHighestTrophies': {},
    'brawlersPowerPoints': {},
    'brawlersPowerLevel': {},
    'playerSkills': [],
    'playerBoxDrop': {},
    'gems': 0,
    'coins': 0,
    'starpoints': 0,
    'tutorialState': 1,
    'accountCreatedTime': ""

}

class databasemanager {
    constructor(){
        const playerSchema = new mongoose.Schema({
            high_id: Number,
            low_id: Number,
            token: String,
            data: Object
        });

        mongoose.connect('mongodb://127.0.0.1:27017/tarabrawl_developer', {
            maxIdleTimeMS: 86400000,
            socketTimeoutMS: 0,
            useUnifiedTopology: true
        }).then(()=>{
            // lox
        }).catch((error)=>{
            console.error('Error while connecting database!', error);
        });

        this.playerDB = mongoose.models.players || mongoose.model("players", playerSchema);

        this.db = mongoose.connection;
        this.db.on('error', console.error.bind(console, 'An Error occured in database!'));
        this.db.on('open', function(){
            console.log("Connected to database succesfully!")
        });
    }

    updateAllAccounts(dataDictionary) {
        const updatePromises = [];
        let updatedAccounts = 0
    
        return this.playerDB
          .find({})
          .then(accounts => {
            for (const account of accounts) {
              const accountData = account.data;
              const missingFields = {};
    
              for (const field in dataDictionary) {
                if (!(field in accountData)) {
                    missingFields[field] = dataDictionary[field];
                }
              }

              const update = {
                $set: {
                  'data': { ...accountData, ...missingFields }
                }
              };
    
              updatePromises.push(
                this.playerDB.updateOne({ _id: account._id }, update)
              );
            }
    
            return Promise.all(updatePromises);
          })
          .then(results => {
            console.log(results)
            console.log(`Accounts updated`);
            return;
          })
          .catch(error => {
            console.error('Error updating accounts:', error);
            throw error;
          }).finally(()=>{
            process.exit();
          });
      }
}
module.exports = databasemanager


    
new databasemanager(null).updateAllAccounts(PlayerDataStructure)