const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const DatabaseManager = require('../Database/databasemanager');
const config = require('../config');


const mongoose = require('mongoose');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let panelDB;

async function initPanelDB() {
    try {
        await DatabaseManager.ensureMongoConnected(config.database || "mongodb://127.0.0.1:27017/lunarbrawl_dev");
        panelDB = new DatabaseManager(null, config.database);
        console.log("[WebAdminn] Connected to MongoDB.");
    } catch (err) {
        console.error("[WebAdminn] Failed to connect to MongoDB:", err);
    }
}

initPanelDB();

const requireAuth = (req, res, next) => {
    const providedSecret = req.headers['authorization'] || req.headers['x-admin-secret'];
    if (providedSecret !== config.adminSecret) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};

app.get('/api/csvdata', async (req, res) => {
    try {
        const path = require('path');
        const CSVParse = require('../CSVReader/CSVParse');
        const assetsBase = path.join(__dirname, '..', 'Assets');

        const charRows = CSVParse(path.join(assetsBase, 'csv_logic', 'characters.csv'));
        const brawlers = [];
        let portraitIndex = 0;
        for (const row of charRows) {
            if (row.Disabled && row.Disabled.toLowerCase() === 'true') {
                portraitIndex++;
                continue;
            }
            if (!row.ItemName || row.Type !== 'Hero') {
                portraitIndex++;
                continue;
            }
            brawlers.push({
                id: portraitIndex,
                name: row.ItemName,
                displayName: row.Name,
                portrait: `Assets/Brawlers/Portrait/1600${String(portraitIndex).padStart(4, '0')}.png`
            });
            portraitIndex++;
        }

        const skinRows = CSVParse(path.join(assetsBase, 'csv_logic', 'skins.csv'));
        let skinIndex = 0;
        const skins = [];
        for (const row of skinRows) {
            if (!row.TID || !row.Name) { skinIndex++; continue; }
            const gemCost = parseInt(row.CostGems) || 0;
            const coinCost = parseInt(row.CostCoins) || 0;
            skins.push({
                id: skinIndex,
                name: row.Name,
                displayName: row.TID.replace(/^TID_/, '').replace(/_SKIN.*$/, '').replace(/_/g, ' '),
                rawTID: row.TID,
                costGems: gemCost,
                costCoins: coinCost
            });
            skinIndex++;
        }

        const shopRows = CSVParse(path.join(assetsBase, 'csv_client', 'shop_items.csv'));
        const shopTypes = [];
        for (const row of shopRows) {
            if (!row.Name || row.Name.trim() === '') continue;
            const offerType = parseInt(row.OfferType);
            if (isNaN(offerType)) continue;
            shopTypes.push({ id: offerType, name: row.Name });
        }

        res.json({ brawlers, skins, shopTypes });
    } catch (error) {
        console.error('[WebPanel] CSV data error:', error);
        res.status(500).json({ error: 'Failed to load CSV data: ' + error.message });
    }
});


app.get('/api/globaloffers', async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });
        const offersDoc = await panelDB.getGlobalOffers();
        //const offersDoc = { shopRefresh: {}, offers: [] };
        res.json(offersDoc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/api/config', requireAuth, (req, res) => {
    res.json({ shopRefreshSeconds: config.shopRefreshSeconds });
});

app.get('/api/analytics', requireAuth, async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });
        const totalPlayers = await panelDB.playerDB.countDocuments({});

        let onlineCount = 0;
        if (global.clients) {
            onlineCount = global.clients.filter(c => !c._disconnected && c.player).length;
        }

        res.json({
            totalPlayers,
            onlinePlayers: onlineCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/api/players', requireAuth, async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });

        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 50;

        let dbQuery = {};
        if (query) {
            if (!isNaN(query)) {
                dbQuery = { low_id: parseInt(query) };
            } else {
                dbQuery = { "data.username": new RegExp(query, 'i') };
            }
        }

        const players = await panelDB.playerDB.find(dbQuery)
            .sort({ "data.trophies": -1 })
            .limit(limit)
            .lean(); 

        const formattedPlayers = players.map(p => ({
            low_id: p.low_id,
            high_id: p.high_id,
            username: p.data?.username || 'Unknown',
            trophies: p.data?.trophies || 0,
            gems: p.data?.gems || 0,
            coins: p.data?.coins || 0,
            starpoints: p.data?.starpoints || 0,
            thumbnail: p.data?.thumbnail || 0,
            created: p.data?.accountCreatedTime || 'Unknown'
        }));

        res.json(formattedPlayers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/players/:low_id', requireAuth, async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });

        const low_id = parseInt(req.params.low_id);
        const { gems, coins, trophies, starpoints } = req.body;

        const playerDoc = await panelDB.playerDB.findOne({ low_id: low_id });
        if (!playerDoc) {
            return res.status(404).json({ error: "Player not found" });
        }

        if (gems !== undefined) playerDoc.data.gems = parseInt(gems);
        if (coins !== undefined) playerDoc.data.coins = parseInt(coins);
        if (trophies !== undefined) playerDoc.data.trophies = parseInt(trophies);
        if (starpoints !== undefined) playerDoc.data.starpoints = parseInt(starpoints);

        playerDoc.markModified('data.gems');
        playerDoc.markModified('data.coins');
        playerDoc.markModified('data.trophies');
        playerDoc.markModified('data.starpoints');

        await playerDoc.save();

        if (global.clients && global.clients.length > 0) {
            for (let client of global.clients) {
                if (!client._disconnected && client.player && client.player.low_id === low_id) {
                    if (gems !== undefined) client.player.gems = parseInt(gems);
                    if (coins !== undefined) client.player.coins = parseInt(coins);
                    if (trophies !== undefined) client.player.trophies = parseInt(trophies);
                    if (starpoints !== undefined) client.player.starpoints = parseInt(starpoints);
                    break;
                }
            }
        }

        res.json({ success: true, message: "Player updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/globaloffers', requireAuth, async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });
        const updateData = req.body;

        const Helpers = require('../Helpers');
        if (updateData.offers) {
            for (let offer of updateData.offers) {
                if (offer.offerTime && offer.offerTime.includes('-')) {
                    offer.offerTime = offer.offerTime.replace(/-/g, '/');
                }
            }
        }

        const updatedDoc = await panelDB.updateGlobalOffers(updateData);

        if (global.clients && global.clients.length > 0) {
            const { rotateShop } = require('../Logic/Rotation');
            const AvailableServerCommandMessage = require('../Protocol/Messages/Server/AvailableServerCommandMessage');

            for (let client of global.clients) {
                if (!client._disconnected && client.player) {
                    try {
                        let rotated = await rotateShop(client.player, { db: panelDB }, true); 
                        if (rotated) {
                            let msg = new AvailableServerCommandMessage(client, client.player, 211, client.database);
                            await msg.send();
                        }
                    } catch (e) {
                        console.error("[WebAdminn] Broadcast error for client:", e);
                    }
                }
            }
        }

        res.json({ success: true, doc: updatedDoc });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/notifications/personal', requireAuth, async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });
        const { low_id, notificationObj } = req.body;

        if (!low_id || !notificationObj) {
            return res.status(400).json({ error: "Missing low_id or notification object" });
        }

        const playerDoc = await panelDB.playerDB.findOne({ low_id: parseInt(low_id) });
        if (!playerDoc) {
            return res.status(404).json({ error: "Player not found" });
        }

        notificationObj.Timer = Math.floor(Date.now() / 1000);
        notificationObj.IsRead = false;

        if (!playerDoc.data) playerDoc.data = {};
        if (!playerDoc.data.inbox) playerDoc.data.inbox = [];

        playerDoc.data.inbox.push(notificationObj);
        playerDoc.markModified('data.inbox');
        await playerDoc.save();

        if (global.clients && global.clients.length > 0) {
            const AvailableServerCommandMessage = require('../Protocol/Messages/Server/AvailableServerCommandMessage');
            for (let client of global.clients) {
                if (!client._disconnected && client.player && client.player.low_id === parseInt(low_id)) {
                    client.player.inbox = playerDoc.data.inbox;
                    let msg = new AvailableServerCommandMessage(client, client.player, 206, client.database, notificationObj);
                    await msg.send();
                    break;
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/notifications/global', requireAuth, async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });
        const { notificationObj } = req.body;

        if (!notificationObj) {
            return res.status(400).json({ error: "Missing notification object" });
        }

        notificationObj.Timer = Math.floor(Date.now() / 1000);
        notificationObj.IsRead = false;

        await panelDB.playerDB.updateMany({}, { $push: { 'data.inbox': notificationObj } });

        if (global.clients && global.clients.length > 0) {
            const AvailableServerCommandMessage = require('../Protocol/Messages/Server/AvailableServerCommandMessage');
            for (let client of global.clients) {
                if (!client._disconnected && client.player) {
                    if (!client.player.inbox) client.player.inbox = [];
                    client.player.inbox.push(notificationObj);
                    let msg = new AvailableServerCommandMessage(client, client.player, 206, client.database, notificationObj);
                    await msg.send().catch(err => console.error("[WebPanel] Broadcast error for client:", err));
                }
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.delete('/api/globaloffers', requireAuth, async (req, res) => {
    try {
        if (!panelDB) return res.status(500).json({ error: "DB not initialized" });

        const updatedDoc = await panelDB.updateGlobalOffers({ offers: [], shopRefresh: {} });

        if (global.clients && global.clients.length > 0) {
            const { rotateShop } = require('../Logic/Rotation');
            const AvailableServerCommandMessage = require('../Protocol/Messages/Server/AvailableServerCommandMessage');

            for (let client of global.clients) {
                if (!client._disconnected && client.player) {
                    try {
                        let rotated = await rotateShop(client.player, { db: panelDB }, true);
                        if (rotated) {
                            let msg = new AvailableServerCommandMessage(client, client.player, 211, client.database);
                            await msg.send();
                        }
                    } catch (e) {
                        console.error("[WebAdminn] Broadcast error for client:", e);
                    }
                }
            }
        }

        res.json({ success: true, doc: updatedDoc });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`[WebPanel] Dashboard is running at http://localhost:${port}`);
});

module.exports = app;
