class Player {
    // Server Information
    delivery_items = {}
    battle_data = {}
    latency = 0
    room = null // LogicRoom instance

    // Auth
    high_id = 0
    low_id = 1
    token = ""

    // Player Profile Data
    username = "Player"
    isRegistered = false
    experiencePoints = 0
    thumbnail = 0
    name_color = 0
    selectedSkins = {
        0: 0
    }
    unlocked_skins = [0]
    unlocked_pins = [0]
    namechangeCost = 0
    namechangeExist = 1
    accountCreatedTime = ""

    // Region & Content Creator
    playerRegion = "AZ"
    playerContentCreator = "lwitchy"

    // Tutorial
    tutorialState = 2

    // Trophy
    trophies = 0
    highest_trophies = 0

    // Trophy Road Rewards
    rewardtracktype = 0
    rewardforrank = 0
    collected_trophyroadRewards = 1
    trophyroadreward = false
    trophySeasonEndTimer = 604800

    // Player Resources
    gems = 0
    coins = 0
    starpoints = 0
    tickets = 0
    token_doubler = 0

    // Season Data (Brawl Pass)
    availableTokens = 1000
    seasonEndTimer = 604800
    passSeason = 2
    collectedTokens = 0
    premiumTiers = [0]
    freeTiers = [0]
    premiumBytes = [0, 0, 0, 0]
    freeBytes = [0, 0, 0, 0]
    isPremiumPurchased = false
    brawlPass = [
        // not needed
        {
            "passSeason": 2,
            "collectedTokens": 0,
            "premiumTiers": [],
            "freeTiers": [],
            "premiumBytes": [0, 0, 0, 0],
            "freeBytes": [0, 0, 0, 0],
            "isPurchased": false
        }
    ]

    // Player Quests
    quests = [
        {
            "questIndex": 0,
            "questType": 0,
            "questCurrentGoal": 0,
            "questMaximumGoal": 0,
            "questTokensRewards": 250,
            "questCurrentLevel": 0,
            "questMaximumLevel": 0,
            "questTimer": "",
            "brawlPassExclusive": false,
            "questBrawler": [16, 0],
            "questGameMode": 0,
            "questProgression": 0
        }
    ]

    // Inbox & Notifications
    inbox = []
    readGlobalNotifs = []

    // UI & Home Animations
    trophy_animation = 0
    coinAnim = 0
    tokenAnim = 0
    starAnim = 0

    // Other IntValue Entries
    isDemoAccount = 0
    isInvitesBlocked = 0
    playerAgeStatus = 3


    // Shop & Offers
    last_shop_update = "" // Store last generate time
    offers = []

    // Brawlers Data
    home_brawler = 0
    unlocked_brawlers = [0, 1]
    brawlersTrophies = {}
    brawlersHighestTrophies = {}
    brawlersPowerPoints = {}
    brawlersPowerLevel = {}
    selectedPins = {}
    playerSkills = []

    // Box Drop 
    playerBoxDrop = {
        // Kutudan bişeyin düşme faktörleri
        'playerExperienceLevel': 0,
        'playerWinRate': 0,
        'playerPlayTime': 0,
        'playerUnlockedBoxes': 0,
        'playerLastUnlockedLegendary': "",
        'playerLastUnlockedMythic': "",
        'unlockedBoxesAfterLegendary': 0
    }

    loadPlayerCSV_data() {
        for (let x of global.allBrawlers) {
            this.brawlersTrophies[x.toString()] = 0;
        }
        for (let x of global.allBrawlers) {
            this.brawlersHighestTrophies[x.toString()] = 0;
        }
        for (let x of global.allBrawlers) {
            this.brawlersPowerLevel[x.toString()] = 0;
        }
        for (let x of global.allBrawlers) {
            this.brawlersPowerPoints[x.toString()] = 0;
        }
    }
}

module.exports = Player;