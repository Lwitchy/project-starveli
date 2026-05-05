# Starveli Server — Architecture Report

**Project**: LunarBrawl (Brawl Stars Private Server)
**Language**: Node.js (JavaScript)
**Entry Point**: [index.js](file:///c:/Users/lwitchy/Desktop/Starveli/index.js)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Client["Brawl Stars Client"]
        APP[Android APK]
    end

    subgraph Entry["Entry Point - index.js"]
        MAIN[socketserver class]
    end

    subgraph TCP["TCP Game Server :9339"]
        CONN[Connection Handler]
        HAND[Handshake Validator]
        MH[MessagesHandler]
    end

    subgraph UDP["UDP Battle Server :9338"]
        UGW[UdpGateway]
        SESSION[Session Manager]
    end

    subgraph Protocol["Protocol Layer"]
        MF[MessageFactory]
        PM[PiranhaMessage]
        CLIENT_MSG[15 Client Messages]
        SERVER_MSG[13 Server Messages]
        CLIENT_CMD[13 Client Commands]
        SERVER_CMD[6 Server Commands]
    end

    subgraph Logic["Game Logic"]
        PLAYER[Player Instance]
        BATTLE[BattleMode]
        ROTATION[Event & Shop Rotation]
        CHAR[LogicCharacter]
        PROJ[LogicProjectile]
    end

    subgraph Data["Data Layer"]
        CSV[CSVReader]
        ASSETS[Assets/csv_logic/*.csv]
        EVENTS[Events.js]
    end

    subgraph DB["Database"]
        MONGO[(MongoDB)]
        DBM[DatabaseManager]
    end

    subgraph Crypto["Crypto"]
        PEPPER[PepperEncrypter]
        NACL[NaCl/Blake2b]
    end

    subgraph Web["Web Services"]
        PANEL[Admin Panel :3000]
        ASSET_SRV[Assets Server :2000]
    end

    APP -->|TCP| CONN
    APP -->|UDP| UGW
    MAIN --> CONN
    MAIN --> UGW
    MAIN --> CSV
    MAIN --> PANEL

    CONN --> HAND
    HAND -->|valid| MH
    MH --> MF
    MF --> CLIENT_MSG
    CLIENT_MSG --> PLAYER
    CLIENT_MSG --> SERVER_MSG

    UGW --> SESSION
    SESSION --> BATTLE
    BATTLE --> CHAR
    BATTLE --> PROJ

    CLIENT_MSG --> CLIENT_CMD
    SERVER_MSG --> SERVER_CMD

    PLAYER --> DBM
    DBM --> MONGO
    CSV --> ASSETS
    ROTATION --> EVENTS
    PANEL --> DBM
    CLIENT_MSG --> PEPPER
```

---

## Server Boot Sequence

```mermaid
sequenceDiagram
    participant Main as index.js
    participant CSV as CSVReader
    participant DB as MongoDB
    participant TCP as TCP Server
    participant UDP as UdpGateway
    participant Panel as Web Panel
    participant Assets as Assets Server

    Main->>CSV: reader.init()
    CSV->>CSV: loadAllBrawlers()
    CSV->>CSV: loadCardIDs()
    CSV->>CSV: loadLocations()
    CSV->>CSV: loadAllSkins() + skinPrices
    CSV->>CSV: loadBattleData()
    Note over CSV: Populates globals: allBrawlers, cardIDs,<br/>allMaps, allSkins, skinPrices, battleData

    Main->>DB: ensureMongoConnected()
    Main->>DB: loadLastLowID()
    Main->>UDP: new UdpGateway(9338)
    Main->>Panel: require('./Panel/server.js') → Express :3000
    Main->>TCP: server.listen(9339)
    Main->>Main: rotateEvents() + setInterval(10s)
```

---

## Module Breakdown

### 1. Entry Point — [index.js](file:///c:/Users/lwitchy/Desktop/Starveli/index.js)

| Responsibility | Details |
|---|---|
| TCP Server | `net.Server` on port **9339** |
| Initialization | CSV loading → MongoDB → UDP gateway → Web Panel |
| Connection limits | Max **5** connections/IP |
| Packet framing | 7-byte header: `[id:2][len:3][version:2]` |
| Anti-bot | Time-based handshake ([(seed ^ 0x53544152) + 0x1337](file:///c:/Users/lwitchy/Desktop/Starveli/index.js#85-88)) with ±60s window |
| Buffer overflow guard | Max 512KB per client buffer |
| Session timeout | Configurable (dev: 20s, prod: 15s) |

### 2. Networking

| File | Purpose |
|---|---|
| [MessagesHandler.js](file:///c:/Users/lwitchy/Desktop/Starveli/Networking/MessagesHandler.js) | Routes packet IDs → handler classes, calls [decode()](file:///c:/Users/lwitchy/Desktop/Starveli/Protocol/Messages/Client/TitanLoginMessage.js#18-28) then [process()](file:///c:/Users/lwitchy/Desktop/Starveli/Protocol/PiranhaMessage.js#22-25) |
| [Queue.js](file:///c:/Users/lwitchy/Desktop/Starveli/Networking/Queue.js) | Packet assembly buffer with merged-packet detection (legacy, partially used) |
| [UdpGateway.js](file:///c:/Users/lwitchy/Desktop/Starveli/Networking/UdpGateway.js) | UDP socket on **9338**, session binding, routes `ClientInputMessage` (type 10555) to [BattleMode](file:///c:/Users/lwitchy/Desktop/Starveli/Logic/Instances/BattleMode.js#8-378) |

### 3. Protocol

```mermaid
classDiagram
    class ByteStream {
        +readInt()
        +writeInt()
        +readVInt()
        +writeVInt()
        +readString()
        +writeString()
        +readBoolean()
        +writeBoolean()
        +readDataReference()
        +writeDataReference()
        +send()
    }

    class PiranhaMessage {
        +id: Number
        +version: Number
        +client: Socket
        +encode()
        +decode()
        +process()
    }

    class MessageFactory {
        +packets: Object
        +getAllPackets()
    }

    ByteStream <|-- PiranhaMessage
    PiranhaMessage <|-- ClientMessages
    PiranhaMessage <|-- ServerMessages

    MessageFactory --> PiranhaMessage : loads
```

#### Client Messages (ID < 20000)
| ID | File | Purpose |
|---|---|---|
| 10100 | ClientHelloMessage | Initial hello (unencrypted) |
| 10101 | TitanLoginMessage | **Main login** — auth, account creation, shop rotation |
| 10107 | ClientCapabilities | Device capability report |
| 10108 | KeepAliveMessage | Heartbeat / keeps session alive |
| 10112 | ChangeAvatarNameMessage | Name change request |
| 10113 | AvatarNameCheckRequestMessage | Name availability check |
| 10212 | GetPlayerProfileMessage | View another player's profile |
| 10501 | AskForBattleEndMessage | Request to end/leave battle |
| 10504 | BattleStartedHome | Confirms client loaded battle |
| 10512 | MatchMakeRequestMessage | Start matchmaking → creates BattleMode |
| 10555 | ClientInputMessage | **UDP battle input** (movement, attack, emote) |
| 14102 | EndClientTurnMessage | **Game commands** — purchases, upgrades, etc. |
| 14109 | GoHomeFromOfflinePractise | Return to lobby |
| 14110 | PlayerStatusMessage | Player status report |
| 14366 | AnalyticsEventMessage | Client analytics |

#### Server Messages (ID ≥ 20000)
| ID | File | Purpose |
|---|---|---|
| 20100 | ServerHelloMessage | Server hello response |
| 20103 | LoginFailedMessage | Login rejection |
| 20104 | TitanLoginOkMessage | Login success with player IDs/token |
| 20107 | LobbyInfoMessage | Lobby state |
| 20113 | AvatarNameCheckResponseMessage | Name check result |
| 20212 | PlayerProfileMessage | Profile data response |
| 24101 | OwnHomeDataMessage | **Full home state** (brawlers, shop, quests, pass) |
| 24109 | VisionUpdateMessage | **Battle state** (sent via UDP) |
| 24111 | StartLoadingMessage | Battle loading screen trigger |
| 24115 | UdpConnectionInfoMessage | UDP session info for client |
| 24116 | MatchMakingStatusMessage | Matchmaking progress |
| 24124 | BattleEndMessage | Battle results |
| 24111 | AvailableServerCommandMessage | Push server commands to client |

#### Client Commands (via EndClientTurnMessage)
| Command | Purpose |
|---|---|
| LogicSelectBrawlerCommand | Switch active brawler |
| LogicSelectSkinCommand | Equip skin |
| LogicLevelUpCommand | Power up brawler |
| LogicGatchaCommand | Open loot box |
| LogicPurchaseOfferCommand | Buy shop offer |
| LogicPurchaseBrawlPass | Buy Brawl Pass |
| LogicPurchaseBrawlpassProgressCommand | Buy pass tier |
| LogicClaimRankUpRewardCommand | Claim rank reward |
| LogicClaimTailRewardCommand | Claim trophy road reward |
| LogicClearShopTickCommand | Mark offer as seen |
| LogicSetPlayerThumbnailCommand | Change player icon |
| LogicSetPlayerNameColorCommand | Change name color |
| LogicViewInboxNotificationCommand | Mark notification read |

#### Server Commands (pushed to client)
| Command | Purpose |
|---|---|
| LogicAddNotificationCommand (206) | Push inbox notification |
| LogicChangeAvatarNameCommand | Confirm name change |
| LogicDayChangedCommand | Day-change trigger |
| LogicOffersChangedCommand (211) | Refresh shop offers |
| LogicGiveDeliveryCommand | Grant items/rewards |
| LogicBuyPinPacks | Pin pack purchase result |

### 4. Database — MongoDB

```mermaid
erDiagram
    PLAYERS {
        Number high_id PK
        Number low_id PK
        String token
        Object data
    }
    GLOBALOFFERS {
        Object shopRefresh
        Array offers
    }
    GLOBALNOTIFICATIONS {
        Array notifications
    }
```

Key operations: [createAccount()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#100-158), [loadAccount()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#179-193), [updateAccountData()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#159-178), [updateAllAccounts()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#194-218), [loadLastLowID()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#219-236), [getGlobalOffers()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#55-72), [updateGlobalOffers()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#73-82), [getGlobalNotifications()](file:///c:/Users/lwitchy/Desktop/Starveli/Database/databasemanager.js#83-90).

### 5. Game Logic

#### Player Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Connected: TCP Connect
    Connected --> Handshake: Receive 25000
    Handshake --> Login: Send 10101
    Login --> NewAccount: low_id == 0
    Login --> LoadAccount: low_id > 0
    NewAccount --> Home: Create + Send 20104 + 24101
    LoadAccount --> Home: Load + Send 20104 + 24101
    Home --> Matchmaking: Send 10512
    Matchmaking --> InBattle: UDP session created
    InBattle --> Home: Battle ends / 10501
    Home --> [*]: Disconnect
```

#### Battle System

```mermaid
graph LR
    subgraph BattleMode["BattleMode (30Hz tick loop)"]
        HI[handleInputs]
        TGO[tickGameObjects]
        CWC[checkWinCondition]
        SVU[sendVisionUpdates]
    end

    subgraph Objects["Game Objects"]
        LC[LogicCharacter]
        LP[LogicProjectile]
    end

    subgraph Encoding["State Encoding"]
        BS[BitStream]
        VU[VisionUpdateMessage]
    end

    HI -->|type 2| MOVE[Movement]
    HI -->|type 0| ATK[Attack → LogicCharacter.attack]
    HI -->|type 9| EMOTE[Emote]
    ATK --> LP
    TGO --> LC
    TGO --> LP
    SVU --> BS
    BS --> VU
    VU -->|UDP| CLIENT[Client]
```

- **Tick rate**: 30Hz (33ms intervals)
- **Movement**: Absolute coordinates, speed 30 units/tick toward target
- **Attacks**: Burst firing with ammo system (1000 units/bar), fan spread or parallel bullets
- **Projectiles**: 4 substeps/tick, collision at ≤222 units, removed after `castingTime` ticks
- **Input deduplication**: Tracks `lastHandledInput` index to ignore UDP retransmissions

### 6. Shop & Event Rotation

```mermaid
graph TD
    RT[rotateEvents - every 10s] --> SLOT1[Slot 1: Gem Grab - 24h]
    RT --> SLOT2[Slot 2: Solo Showdown - 24h]
    RT --> SLOT3[Slot 3: Brawl Ball - 24h]
    RT --> SLOT4[Slot 4: Weekend Events]
    RT --> SLOT5[Slot 5: Duo Showdown - 24h]

    RS[rotateShop - on login] --> FREE[Free daily item]
    RS --> MEGA[Discounted Mega Box]
    RS --> PP[3x Power Point offers]
    RS --> SKIN[5x Skin offers]
    RS --> GLOBAL[Global offers from DB]
```

### 7. Crypto — Pepper Encryption

| Phase | Message | Action |
|---|---|---|
| Client Hello | 10100 | Passthrough (unencrypted) |
| Login | 10101 | NaCl box_open with derived shared key |
| Server Hello | 20100 | Passthrough, stores session token |
| Login OK | 20104/20103 | NaCl box with nonce + new session key |
| Subsequent | All others | NaCl box with incrementing nonce |

### 8. Web Panel — Express :3000

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/csvdata` | GET | No | Brawler/skin/shop CSV data |
| `/api/globaloffers` | GET | No | View current offers |
| `/api/globaloffers` | POST | Yes | Create/update offers → broadcast to clients |
| `/api/globaloffers` | DELETE | Yes | Clear all offers |
| `/api/config` | GET | Yes | Shop timing config |
| `/api/analytics` | GET | Yes | Total + online player counts |
| `/api/players` | GET | Yes | Search/list players |
| `/api/players/:low_id` | POST | Yes | Edit player resources (live update) |
| `/api/notifications/personal` | POST | Yes | Send notification to one player |
| `/api/notifications/global` | POST | Yes | Broadcast notification to all |

### 9. Assets Server — Express :2000

Serves static files from `custom_assets/` directory with CORS. Generates SHA-1 hashes on startup for asset verification.

### 10. CSV Data Pipeline

```mermaid
graph LR
    CSV_FILES["Assets/csv_logic/*.csv"] --> READER[CSVReader]
    READER --> |characters.csv| BRAWLERS[global.allBrawlers]
    READER --> |cards.csv| CARDS[global.cardIDs]
    READER --> |locations.csv| MAPS[global.allMaps]
    READER --> |skins.csv| SKINS[global.allSkins]
    READER --> |skins.csv| PRICES[global.skinPrices]
    READER --> |skin_confs.csv| BRAWLER_SKINS[global.allSkinsForBrawler]
    READER --> |skills.csv + projectiles.csv| BATTLE[global.battleData]
```

---

## Request Flow — Full Login

```mermaid
sequenceDiagram
    participant C as Client
    participant TCP as TCP Server
    participant MH as MessagesHandler
    participant Crypto as PepperEncrypter
    participant Login as TitanLoginMessage
    participant DB as MongoDB
    participant Shop as rotateShop

    C->>TCP: TCP Connect
    TCP->>TCP: Rate limit check (5/IP)
    TCP->>TCP: Init Player + DB + Crypto

    C->>TCP: Packet 25000 (Handshake)
    TCP->>TCP: Validate TOTP seed ±60s
    
    C->>TCP: Packet 10100 (ClientHello)
    TCP->>MH: route(10100)
    MH->>Crypto: decrypt(10100) → passthrough
    TCP-->>C: Packet 20100 (ServerHello)

    C->>TCP: Packet 10101 (TitanLogin)
    TCP->>MH: route(10101)
    MH->>Login: decode() → high_id, low_id, token
    
    alt New Account (low_id == 0)
        Login->>DB: createAccount()
    else Existing
        Login->>DB: loadAccount()
    end
    
    Login->>Shop: rotateShop()
    Login->>DB: updateOffers()
    Login-->>C: Packet 20104 (LoginOK)
    Login-->>C: Packet 24101 (OwnHomeData)
```

---

## Global State

The server relies heavily on `global.*` for shared state:

| Global | Set By | Purpose |
|---|---|---|
| `global.allBrawlers` | CSVReader | Array of brawler indices |
| `global.cardIDs` | CSVReader | Brawler → card ID mapping |
| `global.allMaps` | CSVReader | Map pools by game mode |
| `global.allSkins` | CSVReader | All non-default skin indices |
| `global.skinPrices` | CSVReader | Skin cost/currency lookup |
| `global.allSkinsForBrawler` | CSVReader | Brawler → available skins |
| `global.battleData` | CSVReader | Per-brawler attack stats |
| `global.lastLowID` | DatabaseManager | Auto-increment player ID counter |
| `global.connectionCount` | index.js | Online player count |
| `global.clients` | index.js | Array of connected TCP sockets |
| `global.udpGateway` | index.js | UDP battle server instance |

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| mongoose | ^7.6.7 | MongoDB ODM |
| express | ^5.2.1 | Web Panel + Assets Server |
| body-parser | ^2.2.2 | JSON request parsing |
| cors | ^2.8.6 | Cross-origin requests |
| csv | ^6.3.1 | CSV file parsing |
| glob | ^7.2.0 | File pattern matching |
| luxon | ^3.4.4 | Date/time calculations |
| minimist | ^1.2.8 | CLI argument parsing |
| extend | ^3.0.2 | Config merging |
| crypto | built-in | Hashing, NaCl keys |

---

## File Tree (excluding Reference/)

```
Starveli/
├── index.js                          # Entry point — TCP server
├── config.js                         # Environment config (dev/prod)
├── assets_server.js                  # Static asset server :2000
├── Helpers.js                        # Date/time utilities
├── LogicBoxData.js                   # Loot box drop tables
├── updateDatabase.js                 # DB migration script
│
├── Networking/
│   ├── MessagesHandler.js            # Packet router
│   ├── Queue.js                      # Packet assembly
│   └── UdpGateway.js                 # UDP battle transport
│
├── Protocol/
│   ├── MessageFactory.js             # Auto-loads client handlers
│   ├── PiranhaMessage.js             # Base message class
│   ├── Messages/Client/              # 15 client message handlers
│   ├── Messages/Server/              # 13 server message encoders
│   ├── Commands/Client/              # 13 game command processors
│   └── Commands/Server/              # 6 server-push commands
│
├── Logic/
│   ├── Instances/Player.js           # Player data model
│   ├── Instances/BattleMode.js       # Real-time battle simulation
│   ├── Battle/LogicCharacter.js      # Brawler combat logic
│   ├── Battle/LogicProjectile.js     # Projectile physics
│   ├── Battle/LogicBox.js            # In-battle box entity
│   ├── Rotation.js                   # Event/shop rotation engine
│   ├── LogicMath.js                  # Trig lookup tables
│   ├── LogicVector2.js               # 2D vector math
│   └── LogicBoxData.js               # Box reward calculations
│
├── ByteStream/
│   ├── index.js                      # Main binary serializer
│   ├── ByteArray.js                  # Hex utils
│   ├── LogicLong.js                  # 64-bit int support
│   └── BitStream/                    # Bit-level serialization (battle)
│
├── Crypto/
│   ├── PepperEncrypter.js            # NaCl encrypt/decrypt
│   ├── Nacl.js                       # TweetNaCl implementation
│   ├── Nonce.js                      # Nonce management
│   ├── blake2b.js                    # Blake2b hash
│   └── util.js                       # Crypto utilities
│
├── CSVReader/
│   ├── reader.js                     # CSV data loader
│   └── CSVParse.js                   # Low-level CSV parser
│
├── Database/
│   └── databasemanager.js            # Mongoose models + CRUD
│
├── Data/
│   ├── Events.js                     # Event slot definitions
│   └── globaloffers.json             # Default offer seed
│
├── Panel/
│   ├── server.js                     # Express admin API
│   └── public/                       # Dashboard frontend
│
└── Assets/                           # Game CSV data files
    ├── csv_logic/                    # characters, skins, skills, etc.
    └── csv_client/                   # shop_items, etc.
```
