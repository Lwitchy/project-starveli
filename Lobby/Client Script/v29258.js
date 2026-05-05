/*
    BSClient - v29.258 ARM32
    03/31/2026
*/
const scriptAuthor = "lwitchy";
const scriptVersion = "1.0.0";
const redirectIP = "172.16.0.109";
const redirectPort = 9339;
let scriptType = "dev";
let accountType = "null"; // Will get from LoginOkMessage::decode
const lobbyInfoText = `Starveli Client ${scriptVersion}\nConnected to ${redirectIP}:${redirectPort}\nScript Type: ${scriptType}`;

let offlinePlayerNames = [
    "blah",
    "blah",
    "blah"
];

// tmr supercell id
// sub_5C8DA8

const allSkinsforBrawler = {
    '0': [29, 52, 122, 159, 195, 196],
    '1': [2, 69, 135],
    '2': [25, 64, 178],
    '3': [5, 58, 72, 91, 201],
    '4': [26, 68, 130, 171],
    '5': [11, 96, 208],
    '6': [27, 59, 90, 116],
    '7': [44, 47, 123, 162, 174],
    '8': [15, 60, 79, 148],
    '9': [56, 57, 97, 160],
    '10': [28, 30, 128, 183, 187, 213],
    '11': [50, 63, 75, 173],
    '12': [20, 49, 95],
    '13': [71, 140, 214],
    '14': [94, 163],
    '15': [108, 120, 147, 197, 198],
    '16': [179],
    '17': [111, 145],
    '18': [70, 158],
    '19': [61, 88, 165],
    '20': [45, 125],
    '21': [117, 172],
    '22': [190],
    '23': [110, 126, 131, 199, 200],
    '24': [],
    '25': [104, 132, 134],
    '26': [146],
    '27': [109, 143],
    '28': [118, 210],
    '29': [139, 188],
    '30': [167, 185, 186, 209],
    '31': [152],
    '32': [137, 202],
    '34': [176, 189],
    '35': [180],
    '36': [194],
    '37': [177, 211],
    '38': [203]
}


// Define Base
const base = Module.findBaseAddress('libg.so');

// Libc Native Functions
var malloc = new NativeFunction(Module.findExportByName('libc.so', 'malloc'), 'pointer', ['int']);
var free = new NativeFunction(Module.findExportByName('libc.so', 'free'), 'void', ['pointer']);
var pthread_mutex_lock = new NativeFunction(Module.findExportByName('libc.so', 'pthread_mutex_lock'), 'int', ['pointer']);
var pthread_mutex_unlock = new NativeFunction(Module.findExportByName('libc.so', 'pthread_mutex_unlock'), 'int', ['pointer']);
var pthread_cond_signal = new NativeFunction(Module.findExportByName('libc.so', 'pthread_cond_signal'), 'int', ['pointer']);
var select = new NativeFunction(Module.findExportByName('libc.so', 'select'), 'int', ['int', 'pointer', 'pointer', 'pointer', 'pointer']);
var memmove = new NativeFunction(Module.findExportByName('libc.so', 'memmove'), 'pointer', ['pointer', 'pointer', 'int']);
var ntohs = new NativeFunction(Module.findExportByName('libc.so', 'ntohs'), 'uint16', ['uint16']);
var inet_addr = new NativeFunction(Module.findExportByName('libc.so', 'inet_addr'), 'int', ['pointer']);
var libc_send = new NativeFunction(Module.findExportByName('libc.so', 'send'), 'int', ['int', 'pointer', 'int', 'int']);
var libc_recv = new NativeFunction(Module.findExportByName('libc.so', 'recv'), 'int', ['int', 'pointer', 'int', 'int']);
var htons = new NativeFunction(Module.findExportByName('libc.so', 'htons'), 'uint16', ['uint16']);
const android_log_write = new NativeFunction(Module.getExportByName(null, '__android_log_write'), 'int', ['int', 'pointer', 'pointer']);
const libc_open = new NativeFunction(Module.findExportByName('libc.so', 'open'), 'int', ['pointer', 'int']);
const libc_read = new NativeFunction(Module.findExportByName('libc.so', 'read'), 'int', ['int', 'pointer', 'int']);
const libc_close = new NativeFunction(Module.findExportByName('libc.so', 'close'), 'int', ['int']);


// UI Stuff & Other Addresses
// Instance addresses
const GUI_instanceAddr = 0xC86B10; // String: "TID_TEAM_REQEST_JOIN_FAIL_PENDING_JOIN_REQUEST"
const sm_offlineHeroTypeAddr = base.add(0xC865DC);

const ServerConnection_connectTo = 0x4102D4;  // found in ServerConnection::connect
const GameMain_update = 0x4BD9D4; // XREF: ServerConnection::update
const ServerConnection_update = 0x5594C; // XREF: ServerConnection::connect |XREF: LogicVersion::isDev
const GameMain_sm_slowMode = 0xC88254; // Found in GameMain::update
const GameMain_reloadGame = 0x383AD4 // Found in GameMain::update

const ADD_FILE = 0x520698; //  String: "sc/effects_brawler.sc"
const STRING_CTOR = 0x4C793C; // String: "enter_age"
const STAGEADDCHILD = 0xFACB4; // String: "open" in SCID
const STAGEREMOVECHILD = 0x219900; // String: "close" in SCID
const CUSTOMBUTTON_PRESSED = 0x64A510; // Found in GameButtonCtor > LogicDataTables::getDefaultButtonClickSound > XREF: MagicSelectableButton::buttonPressed
const GAMEMAIN_INSTANCE = 0x0; // String: "WIPING KEYCHAIN!"
const STAGE_INSTANCE = 0xC87358; // String: "TID_PAGE_FRIENDS_TITLE"
const GUI_INSTANCE = 0x0; // String: "TID_TEAM_REQEST_JOIN_FAIL_PENDING_JOIN_"
const GAME_BUTTON_CTOR = 0x5F3600; // String: "TID_SUPPORT_CREATOR_POPUP_BUTTON"
const MOVIE_CLIP = 0x10E874; // String: "leaderboard_band_item"
const BUTTON_SET_CLIP = 0x1F7CDC; // String: "bubble_hit_area" > in TeamMemberStatusButtonC2EP9MovieClip
const DISPLAYOBJECT_SETXY = 0x61718; // String: "TID_FRIENDS_SUGGESTIONS_SEND_REQUEST"
const FSETTEXT = 0x8D610; // String: "TID_FRIEND_ADD_BUTTON" 

const AddFile = new NativeFunction(base.add(ADD_FILE), 'int', ['pointer', 'pointer', 'int', 'int', 'int', 'int', 'int']);
const StageAdd = new NativeFunction(base.add(STAGEADDCHILD), 'void', ['pointer', 'pointer']);
const StageRemove = new NativeFunction(base.add(STAGEREMOVECHILD), 'void', ['pointer', 'pointer']);
const GameButtonCtor = new NativeFunction(base.add(GAME_BUTTON_CTOR), 'void', ['pointer']);
let movieClip = new NativeFunction(base.add(0x10E874), 'pointer', ['pointer', 'pointer', 'bool']); // String: "leaderboard_band_item"
let ButtonSetClip = new NativeFunction(base.add(0x1F7CDC), 'void', ['pointer', 'pointer']); // String: "bubble_hit_area" > in TeamMemberStatusButtonC2EP9MovieClip
const SetXY = new NativeFunction(base.add(DISPLAYOBJECT_SETXY), 'void', ['pointer', 'float', 'float']);
const fSetText = new NativeFunction(base.add(FSETTEXT), 'pointer', ['pointer', 'pointer']);
const GUI_showFloaterTextAtDefaultPos = new NativeFunction(base.add(0x40C914), 'void', ['pointer', 'pointer', 'float', 'int']); // String: "TID_TEAM_REQEST_JOIN_FAIL_PENDING_JOIN_REQUEST"
const StringCtor = new NativeFunction(base.add(0x4C793C), 'pointer', ['pointer', 'pointer']);
const GenericPopup = new NativeFunction(base.add(0x2AA114), 'void', ['pointer', 'pointer', 'int', 'int', 'pointer', 'pointer', 'pointer']);
const GenericPopup_setTitleTid = new NativeFunction(base.add(0x1F96CC), 'void', ['pointer', 'pointer']);
const GenericPopup_setUpScreenHeader = new NativeFunction(base.add(0x23A734), 'int', ['pointer']);
const GUI_showPopup = new NativeFunction(base.add(0xCB7C0), 'void', ['pointer', 'pointer', 'int', 'int', 'int']);



const getAssetHashPure = new NativeFunction(
    Module.findExportByName("liblwitchy.so", "getAssetHashPure"),
    'pointer',
    ['pointer']
);
//const scidSetString = new NativeFunction(base.add(0x4737EC), "void", ["pointer", "pointer", "pointer"]);

var cache = {
    modules: {},
    options: {}
};

var isCryptoPatched = false;
var isOfflineBattlesPatched = false;
var currentClubMailPopup = null;
var currentSendButtonPtr = null;
var pendingHijacks = [];
var hijackAlreadyQueued = false;
var globalCallbackPins = [];
var isAlreadyLoadedFiles = false;
var isAlreadyLoadedDebugMenu = false;



function log(text) {
    let txt = text.toString();
    const tag = Memory.allocUtf8String('lunarclient');
    const str = Memory.allocUtf8String(txt);
    android_log_write(3, tag, str);
}

function OfflineBattles() {
    if (isOfflineBattlesPatched) return;
    Interceptor.attach(base.add(0x67FEBC), {
        onEnter: function (args) {
            args[3] = ptr(3);
        }
    });


    isOfflineBattlesPatched = true;
}

// Strings Helpers
function newString(message) {
    var charPtr = malloc(message.length + 1);
    Memory.writeUtf8String(charPtr, message);
    return charPtr
}

function createStringObject(text) {
    var a1 = newString(text);
    let a2 = malloc(128);
    StringCtor(a2, a1);
    return a2;
}


function ClearStringObjects(StrObjectPtrArray) {
    for (let ptr of StrObjectPtrArray) {
        WriteToMemory(ptr, "Int", 0);
        WriteToMemory(ptr.add(4), "Int", 0);
        WriteToMemory(ptr.add(8), "Int", 0);
        free(ptr);
    }
}

function readStringObject(stringObjPtr) {
    try {
        if (stringObjPtr.isNull()) return "";
        const stringLength = stringObjPtr.add(4).readS32(); // SCString length is at offset +4, not +0 (Hash)
        if (stringLength <= 0 || stringLength > 50000) return "";

        if (stringLength >= 8) { // SCString SSO threshold is < 8 characters dynamically evaluated
            const heapPointer = stringObjPtr.add(8).readPointer();
            return heapPointer.readUtf8String(stringLength);
        } else {
            return stringObjPtr.add(8).readUtf8String(stringLength);
        }
    } catch (e) {
        log("StringRead Error: " + e.message);
        return "";
    }
}

function showFloaterText(FloaterText = '', stop = 0.0, RGBAcolor = 0xFFFFFFFF) {
    log(`Showing floater text: ${FloaterText}`);
    FloaterText = createStringObject(FloaterText);
    GUI_showFloaterTextAtDefaultPos(base.add(GUI_instanceAddr).readPointer(), FloaterText, stop, RGBAcolor);
    ClearStringObjects([FloaterText]);
}

// ============================
// Debug Menu
// ============================

function extractTextFromPopup(popupPtr, source) {
    try {
        if (popupPtr === null || popupPtr.isNull()) {
            log("extractTextFromPopup: null popup pointer");
            return "";
        }
        var textInputPtr = popupPtr.add(252).readPointer();
        log("TextInput ptr: " + textInputPtr + " (source: " + source + ")");
        if (!textInputPtr.isNull()) {
            // =====================================================================
            // confirmed via raw memory dump:
            //   TextInput + 56: SCString containing the user's typed text
            //     +56 = hash (4 bytes)
            //     +60 = length (4 bytes)
            //     +64 = inline data (SSO, for length < 8)
            //
            //   Example dump: +56:00000004 +60:00000004 +64:74736574 = "test"
            // =====================================================================
            var rawInput = readStringObject(textInputPtr.add(56));
            log("Text at +56: '" + rawInput + "'");
            return rawInput || "";
        } else {
            log("TextInput is NULL!");
        }
    } catch (e) {
        log("extractTextFromPopup error: " + e.message);
    }
    return "";
}

function customDebugMenu() {
    let button_1 = malloc(310);
    
    GameButtonCtor(button_1);
    let texture_button_1 = movieClip(newString("sc/ui.sc"), newString("popover_button_red"), 1);
    ButtonSetClip(button_1, texture_button_1);
    StageAdd(base.add(0xC87358).readPointer(), button_1);
    SetXY(button_1, 310, 560);
    fSetText(button_1, createStringObject("D"));
}



const loadFiles = {
    init() {
        var debug = Interceptor.attach(base.add(ADD_FILE), {
            onEnter(args) {
                debug.detach();
                AddFile(args[0], newString("sc/debug.sc"), -1, -1, -1, -1, 0)
                log("debug.sc loaded");
            }
        });
    },
    loadTextures() {
        //pass
    }
}


// Test POP UP
function testpopup() {
    let popup = malloc(300);
    let PopupExportname = createStringObject("popup_news_tabs");
    let EmptyString = createStringObject("");
    let TitleString = createStringObject("Starveli Client");
    GenericPopup(popup, PopupExportname, 1, 0, EmptyString, EmptyString, EmptyString);
    GenericPopup_setTitleTid(popup, TitleString);
    GUI_showPopup(base.add(GUI_instanceAddr).readPointer(), popup, 1, 0, 0);
    clearStringObjects([PopupExportname, EmptyString, TitleString]);
}

function debugHud() {
    const sm_pDebugHud = base.add(0xC872F8);
    const setDebugHudAddr = base.add(0x484F34);

    const setDebugHud = new NativeFunction(setDebugHudAddr, 'void', ['pointer']);
    const hudPtr = malloc(0x2C); 

    const dummyString = malloc(20); // Supercell Strings are usually 20 bytes
    const textPtr = Memory.allocUtf8String("Starveli_HUD");
    StringCtor(dummyString, textPtr);


    const hudCtor = new NativeFunction(base.add(0x1EA63C), 'void', ['pointer', 'pointer']);

    hudCtor(hudPtr, dummyString);


    setDebugHud(hudPtr);
}

function sendCustomMessage(type, payload = null) {
    var length = payload ? payload.length : 0;
    var messageBuffer = malloc(7 + length);
    Buffer._setEncodingLength(messageBuffer, length);
    Buffer._setMessageType(messageBuffer, type);
    Buffer._setMessageVersion(messageBuffer, 0);

    if (length > 0) {
        for (var i = 0; i < length; i++) {
            Memory.writeU8(messageBuffer.add(7 + i), payload[i]);
        }
    }

    libc_send(cache.fd, messageBuffer, 7 + length, 0);
    free(messageBuffer);
}

function enableDebugInfo() {



}


function setup() {

    Interceptor.attach(Module.findExportByName('libc.so', 'getaddrinfo'), {
        onEnter(args) {
            if (args[0].readUtf8String() == "game.brawlstarsgame.com") {
                args[0].writeUtf8String(redirectIP);
            }
        }
    });

    Interceptor.attach(Module.findExportByName('libc.so', 'connect'), {
        onEnter: function (args) {
            if (ntohs(Memory.readU16(args[1].add(2))) === 9339) {
                cache.fd = args[0].toInt32();
                var host = Memory.allocUtf8String(redirectIP);
                Memory.writeInt(args[1].add(4), inet_addr(host));
                patchCrypto();
                //injectCustomLoginData();
                //LoginOKMessage_Decode();
                receiveMessage();
            }
        }
    });
}


// LoginOkMessage data loc_3E8AA8
// on v36 loc_36AE04


function checkBots() {

    Interceptor.attach(base.add(0x2C49D4), { // LogicBattleModeServer::addPlayer
        onEnter: function (args) {
            const getTable = new NativeFunction(base.add(0x3DEAF8), 'pointer', ['int']);
            const isBot = this.context.sp.add(0xC).readU32();
            const displayDataPtr = this.context.sp.add(0x8).readPointer();
            // Brawler Table (16)
            const charTable = getTable(16);
            const vtable = charTable.readPointer();
            const getItemAt = new NativeFunction(vtable.add(20).readPointer(), 'pointer', ['pointer', 'int']);

            // Skin Table (29)
            const skinTable = getTable(29);
            const skinVtable = skinTable.readPointer();
            const getSkinItemAt = new NativeFunction(skinVtable.add(20).readPointer(), 'pointer', ['pointer', 'int']);



            if (isBot === 1) {
                log("Bot detected! Modifying identity...");
                let selected_brawler = 1; // Default to Shelly

                let selected_skin = allSkinsforBrawler[selected_brawler][Math.floor(Math.random() * allSkinsforBrawler[selected_brawler].length)];
                log(`Selected bot brawler: ${selected_brawler}, skin: ${selected_skin}`);

                const botHeroPointer = getItemAt(charTable, selected_brawler);
                const botSkinPointer = getSkinItemAt(skinTable, selected_skin);

                if (!botHeroPointer.isNull()) {
                    args[2] = botHeroPointer;
                }

                if (!botSkinPointer.isNull()) {
                    this.context.sp.add(0x10).writePointer(botSkinPointer);
                }

                const randomName = offlinePlayerNames[Math.floor(Math.random() * offlinePlayerNames.length)];
                const scStringName = createStringObject(randomName);
                const createDisplayData = new NativeFunction(base.add(0x54F1B4), 'pointer', ['pointer', 'pointer']);
                const newDisplayData = createDisplayData(scStringName, ptr(0));
                this.context.sp.add(0x8).writePointer(newDisplayData);
            }
        }
    });
}


function getFastHash(fileName) {
    //log("Getting fast hash for: " + fileName);
    const namePtr = Memory.allocUtf8String(fileName);
    const resultPtr = getAssetHashPure(namePtr);
    return resultPtr.readUtf8String();
}



function injectCustomLoginData() {
    const safeHookAddress = base.add(0xA5E8C);

    Interceptor.attach(safeHookAddress, {
        onEnter: function (args) {
            const messagePtr = this.context.r7;

            const accesoriesHash = getFastHash("accessories.csv");

            const bossesHash = getFastHash("bosses.csv");

            const cardsHash = getFastHash("cards.csv");

            const charactersHash = getFastHash("characters.csv");

            const itemsHash = getFastHash("items.csv");

            const locationsHash = getFastHash("locations.csv");

            const mapsHash = getFastHash("maps.csv");

            const milestonesHash = getFastHash("milestones.csv");

            const nameColorsHash = getFastHash("name_colors.csv");

            const pinsHash = getFastHash("pins.csv");

            const playerThumbnailsHash = getFastHash("player_thumbnails.csv");

            const projectilesHash = getFastHash("projectiles.csv");

            const resourcesHash = getFastHash("resources.csv");

            const skillsHash = getFastHash("skills.csv");

            const skinsHash = getFastHash("skins.csv");

            const skinsRarityHash = getFastHash("skinsrarity.csv");

            const themesHash = getFastHash("themes.csv");

            const customPayloadStr = `Starveli|${scriptVersion}|${accountType}|${accesoriesHash}|${bossesHash}|${cardsHash}|${charactersHash}|${itemsHash}|${locationsHash}|${mapsHash}|${milestonesHash}|${nameColorsHash}|${pinsHash}|${playerThumbnailsHash}|${projectilesHash}|${resourcesHash}|${skillsHash}|${skinsHash}|${skinsRarityHash}|${themesHash}`;

            const customSupercellString = createStringObject(customPayloadStr);

            messagePtr.add(0x78).writePointer(customSupercellString);
        }
    });
}

function LoginOKMessage_Decode() {
    let okMessageDecode = Interceptor.attach(base.add(0x131B14), { // LoginOkMessage::decode
        onEnter: function (args) {
            this.messagePtr = args[0];
        },
        onLeave: function (retval) {
            log("LoginOkMessage decoded! Extracting payload...");

            try {
                const envStringObjPtr = this.messagePtr.add(0x78).readPointer();

                if (!envStringObjPtr.isNull()) {
                    const stringLength = envStringObjPtr.readS32();
                    log(`String Length detected: ${stringLength}`);

                    if (stringLength > 0 && stringLength < 50000) {

                        let envString = "";

                        if (stringLength > 15) {
                            const heapPointer = envStringObjPtr.add(8).readPointer();
                            envString = heapPointer.readUtf8String(stringLength);
                        } else {
                            envString = envStringObjPtr.add(8).readUtf8String(stringLength);
                        }

                        log(`Success! Extracted Payload: ${envString}`);

                        if (envString.includes("|")) {
                            const parts = envString.split("|");
                            offlinePlayerNames.push(...parts.slice(3)); // Skip the first 3 parts
                            accountType = parts[0];
                            log(`Account Type: ${accountType}`);
                            log("small army loaded! " + offlinePlayerNames.length);
                        }
                    } else {
                        log("String length is 0 or invalid.");
                    }
                }
            } catch (e) {
                log(`Frida Memory Error: ${e.message}`);
            }
        }
    });
}


function receiveMessage() {
    const receiveMessage = Interceptor.attach(base.add(0x3E3C98), { // MessageManager::receiveMessage
        onEnter(args) {
            const message = args[1];
            const messageType = new NativeFunction(Memory.readPointer(Memory.readPointer(message).add(20)), 'int', ['pointer'])(message);
            if (messageType === 20104) {
                OfflineBattles();
                receiveMessage.detach();
            }
        }
    });
}

function patchCrypto() {
    if (isCryptoPatched) return;
    var keyPatch = Interceptor.replace(base.add(0x262194), new NativeCallback(function (sk) {
        sk.writeByteArray([0x3E, 0xCD, 0x93, 0x8D, 0x8A, 0xBF, 0xA7, 0x9A, 0xED, 0x89, 0x2C, 0x12, 0x63, 0xD1, 0x0E, 0xD0, 0x8D, 0xC9, 0x4F, 0x1A, 0x7E, 0xCE, 0xE4, 0xFF, 0x50, 0x8E, 0xBF, 0x23, 0x61, 0x72, 0x62, 0x65]);
    }, 'void', ['pointer']));

    var chPatch = Interceptor.attach(base.add(0x51A6FC), {
        onEnter(args) {
            args[0].add(80).writeInt(3); // Protocol (3 (true))
            args[0].add(84).writeInt(1); // Key version
        }
    });

    isCryptoPatched = true;
}


function signatureKill() {
    Armceptor.jumpout(base.add(0xB52C8), base.add(0xB9010)); // g_createGameInstance
    Armceptor.jumpout(base.add(0xA4E08), base.add(0xA5E7C)); // LoginMessage::encode
    Armceptor.jumpout(base.add(0x2A79D0), base.add(0x2A8A64)); // Inputsystem::update

    Armceptor.jumpout(base.add(0x656B9C), base.add(0x65EEEC)); // Gamemain ctor
    Armceptor.replace(base.add(0x61716C), [0x00, 0xF0, 0x20, 0xE3]); // Messaging::onReceive - snprintf("%s/%s/stat")
    Armceptor.jumpout(base.add(0xEAA50), base.add(0xEB914)); // CombatHUD::ultiButtonActivated
    Armceptor.jumpout(base.add(0x1348c8), base.add(0x1356B8)); // TcpSocket::create

    {
        /*
        Silly checks
        0x7F000000 if IP starts with 127.
        0xA0000000 if IP starts with 10.
        */

        Armceptor.replace(base.add(0x5ACC7C), [0xEA, 0x17, 0x00, 0xE3]);
        Armceptor.replace(base.add(0x5ACC80), [0x2A, 0x20, 0xA0, 0xE3]);
    }
}

function WriteToMemory(address, valueType, value) {
    switch (valueType.toLowerCase()) {
        case "u8":
            Memory.protect(address, 1, "rwx");
            Memory.writeU8(address, value);
            break;
        case "byte":
            Memory.protect(address, 1, "rwx");
            Memory.writeS8(address, value);
            break;
        case "ushort":
            Memory.protect(address, 2, "rwx");
            Memory.writeU16(address, value);
            break;
        case "short":
            Memory.protect(address, 2, "rwx");
            Memory.writeS16(address, value);
            break;
        case "uint":
            Memory.protect(address, 4, "rwx");
            Memory.writeU32(address, value);
            break;
        case "int":
            Memory.protect(address, 4, "rwx");
            Memory.writeS32(address, value);
            break;
        case "float":
            Memory.protect(address, 4, "rwx");
            Memory.writeFloat(address, value);
            break;
        case "pointer":
            Memory.protect(address, 4, "rwx");
            Memory.writePointer(address, value);
            break;
        case "ulong":
            Memory.protect(address, 8, "rwx");
            Memory.writeU64(address, value);
            break;
        case "long":
            Memory.protect(address, 8, "rwx");
            Memory.writeS64(address, value);
            break;
        case "double":
            Memory.protect(address, 8, "rwx");
            Memory.writeDouble(address, value);
            break;
        case "bytearray":
            Memory.protect(address, value.length, "rwx");
            Memory.writeByteArray(address, value);
            break;
        case "string":
            Memory.protect(address, value.length, "rwx");
            Memory.writeUtf8String(address, value);
            break;
    }
}

const Armceptor = {
    nop: function (addr) {
        Armceptor.replace(addr, [0x00, 0xF0, 0x20, 0xE3]);
    },
    replace: function (address, newInsn) {
        Memory.protect(address, newInsn.length, 'rwx');
        address.writeByteArray(newInsn);
        Memory.protect(address, newInsn.length, 'rx');
    },
    ret: function (addr) {
        Armceptor.replace(addr, [0x1E, 0xFF, 0x2F, 0xE1]);
    },
    jumpOffset: function (addr, target) {
        Memory.patchCode(addr, Process.pageSize, function (code) {
            var writer = new ArmWriter(code, {
                pc: addr
            });
            writer.putBImm(target);
            writer.flush();
        });
    },
    jumpout: function (addr, target) {
        Memory.patchCode(addr, Process.pageSize, function (code) {
            var writer = new ArmWriter(code, {
                pc: addr
            });
            writer.putBranchAddress(target);
            writer.flush();
        });
    }
}

rpc.exports = {
    init: function (stage, options) {
        Interceptor.detachAll();
        signatureKill();
        setup();
        log("Magic start");
    }
};