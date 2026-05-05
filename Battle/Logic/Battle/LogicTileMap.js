const TILE_WIDTH = 60;
const TILE_HEIGHT = 60;
const TILE_SIZE = 300;
const WALL_CODES = new Set(['M', 'X', 'C', 'Y', 'I', 'T', 'B', 'N', 'J']);
const DESTRUCTIBLE_CODES = new Set(['M', 'X', 'C', 'F', 'R', 'T', 'B', 'N', 'Y', 'W', 'a']);

const SPAWN_CODES = new Set(['1', '2']);
const BOX_CODE = '4';

class LogicTileMap {
    constructor() {
        this.tiles = [];
        this.width = TILE_WIDTH;
        this.height = TILE_HEIGHT;
    }

    static fromString(mapString) {
        const tileMap = new LogicTileMap();

        let idx = 0;
        for (let row = 0; row < TILE_HEIGHT; row++) {
            tileMap.tiles[row] = [];
            for (let col = 0; col < TILE_WIDTH; col++) {
                tileMap.tiles[row][col] = idx < mapString.length ? mapString[idx] : '.';
                idx++;
            }
        }

        return tileMap;
    }

    static fromMapName(mapName) {
        const CSVParse = require('../../CSVReader/CSVParse');
        const maps = CSVParse('./Assets/csv_logic/maps.csv');

        let started = false;
        let mapString = '';

        for (const row of maps) {
            if (row.Group === mapName) {
                started = true;
            } else if (row.Group && row.Group !== '' && started) {
                break; 
            }

            if (started && row.Data) {
                mapString += row.Data;
            }
        }

        if (mapString.length === 0) {
            console.warn(`[TileMap] Map "${mapName}" not found, using empty map`);
            mapString = '.'.repeat(TILE_WIDTH * TILE_HEIGHT);
        }

        console.log(`[TileMap] Loaded map "${mapName}": ${mapString.length} chars`);
        return LogicTileMap.fromString(mapString);
    }

    static fromLocationId(locationId) {
        const CSVParse = require('../../CSVReader/CSVParse');

        const locId = Number(locationId);
        if (isNaN(locId) || locId < 0) {
            console.warn(`[TileMap] Invalid location ID: ${locationId}, using location 0 (fallback)`);
            return LogicTileMap.fromMapName('Gemgrab_9'); // Fallback to first gemgrab map
        }

        const locations = CSVParse('./Assets/csv_logic/locations.csv');

        if (locId < locations.length) {
            const mapName = locations[locId].AllowedMaps;
            if (mapName) {
                console.log(`[TileMap] Location ${locId} -> Map "${mapName}"`);
                return LogicTileMap.fromMapName(mapName);
            }
        }

        console.warn(`[TileMap] Location ${locId} not found (out of range), using empty map`);
        return LogicTileMap.fromString('.'.repeat(TILE_WIDTH * TILE_HEIGHT));
    }


    getTile(tileX, tileY) {
        if (tileX < 0 || tileX >= TILE_WIDTH || tileY < 0 || tileY >= TILE_HEIGHT) {
            return 'X'; // Out of bounds = wall
        }
        return this.tiles[tileY][tileX];
    }

    static worldToTile(worldX, worldY) {
        return {
            tileX: Math.floor((worldX - 150) / TILE_SIZE),
            tileY: Math.floor((worldY - 50) / TILE_SIZE),
        };
    }


    destroysProjectile(tileX, tileY) {
        const code = this.getTile(tileX, tileY);
        return WALL_CODES.has(code);
    }


    isDestructible(tileX, tileY) {
        const code = this.getTile(tileX, tileY);
        return DESTRUCTIBLE_CODES.has(code);
    }

    isBox(tileX, tileY) {
        return this.getTile(tileX, tileY) === BOX_CODE;
    }

 
    getPlayerSpawns() {
        const spawns = [];
        for (let row = 0; row < TILE_HEIGHT; row++) {
            if (!this.tiles[row]) continue;
            for (let col = 0; col < TILE_WIDTH; col++) {
                const code = this.getTile(col, row);
                if (SPAWN_CODES.has(code)) {
                    spawns.push({
                        team: code === '1' ? 0 : 1, // '1' = Team 0 (Blue/Solo), '2' = Team 1 (Red/Duo)
                        x: 150 + col * TILE_SIZE,
                        y: 50 + row * TILE_SIZE
                    });
                }
            }
        }
        return spawns;
    }


    getBoxSpawns() {
        const spawns = [];
        for (let row = 0; row < TILE_HEIGHT; row++) {
            if (!this.tiles[row]) continue;
            for (let col = 0; col < TILE_WIDTH; col++) {
                const code = this.getTile(col, row);
                if (code === BOX_CODE) {
                    spawns.push({
                        x: 150 + col * TILE_SIZE,
                        y: 50 + row * TILE_SIZE
                    });
                }
            }
        }
        return spawns;
    }

    isInPlayArea(worldX, worldY) {
        return worldX >= 0 && worldY >= 0 &&
            worldX <= 150 + TILE_SIZE * TILE_WIDTH &&
            worldY <= 50 + TILE_SIZE * TILE_HEIGHT;
    }
}

module.exports = LogicTileMap;
