console.log(
  "[SERVER] >> Server started!"
)

const net = require('net')
const MessageFactory = require('./Protocol/MessageFactory');
const PlayerClass = require('./Logic/Instances/Player');
const csvReader = require('./CSVReader/reader');
const databasemanager = require('./Database/databasemanager');
const slot_data = require('./Data/Events');
const { rotateEvents } = require('./Logic/Rotation');
const MessagesHandler = require("./Networking/MessagesHandler")
const Cryptography = require('./Crypto/PepperEncrypter.js');
require('./config.js');
require('./Panel/server.js');

const server = new net.Server();
const Messages = new MessageFactory(true);
const reader = new csvReader();


class socketserver {
  constructor() {
    this.start();
  }

  async start() {
    try {
      await this.initServer();
      this.listen();
    } catch (err) {
      console.error('\n[FATAL] Server failed to start:', err.message);
      process.exit(1);
    }
  }

  async initServer() {
    await reader.init(); // Init CSV Reader
    const { ensureMongoConnected } = require('./Database/databasemanager');
    await ensureMongoConnected(config.database);
    const dbManager = new databasemanager(null, config.database);
    global.lastLowID = await dbManager.loadLastLowID();
    global.connectionCount = 0; // Online Players Count
    global.clients = []; // Track connected clients for broadcasting

    console.log('[SERVER] UDP Battle Server should be running as seperated server');
  }

  async listen() {
    // First Rotate Events, then set Interval to rotate them every 10 sec
    rotateEvents(slot_data); 

    setInterval(function () {
      rotateEvents(slot_data);
    }, 10000); // Run that function every 10 sec

    const ipConnectionMap = new Map();

    server.on('connection', async (client) => {
      const ip = client.remoteAddress;
      const currentConnections = ipConnectionMap.get(ip) || 0;

      if (currentConnections >= 5) {
        client.destroy();
        return;
      }
      ipConnectionMap.set(ip, currentConnections + 1);

      // Init new player
      {
        global.connectionCount++; // Increase Global Count
        client.setTimeout(config.sessionTimeoutSeconds * 1000)

        client.log = function (text) {
          return console.log(`[${this.remoteAddress.split(':').slice(-1)}] >> ${text}`)
        }

        client.warn = function (text) {
          return console.log(`[${this.remoteAddress.split(':').slice(-1)}] [WARN] >> ${text}`)
        }

        client.errLog = function (text) {
          return console.log(`[${this.remoteAddress.split(':').slice(-1)}] [ERROR] >> ${text}`)
        }

        client.player = new PlayerClass(); 
        client.player.client = client;
        client.player.loadPlayerCSV_data(); 
        client.database = new databasemanager(client.player, config.database); 
        client.packets = Messages.getAllPackets();
        client.crypto = new Cryptography();
        client.buffer = Buffer.alloc(0);
        client._disconnected = false; 
        client.authenticatedHandshake = false; 
      }

      client.log('New Connection!');
      global.clients.push(client);
      const MessageHandler = new MessagesHandler(client, client.packets);

      client.on('data', async (bytes) => {
        if (client.buffer.length + bytes.length > 512 * 1024) {
          return client.destroy();
        }
        client.buffer = Buffer.concat([client.buffer, bytes]);

        try {
          while (client.buffer.length >= 7) {
            const headerLen = client.buffer.readUIntBE(2, 3);
            if (headerLen > 65000) {
              return client.destroy();
            }

            if (client.buffer.length < 7 + headerLen) {
              break; 
            }

            const messageHeader = {
              id: client.buffer.readUInt16BE(0),
              len: headerLen,
              version: client.buffer.readUInt16BE(5),
            };
            messageHeader.payload = client.buffer.slice(7, 7 + messageHeader.len);

            client.buffer = client.buffer.slice(7 + messageHeader.len);

            if (false) { // 🥺
              if (messageHeader.id === 25000) {
                const received = messageHeader.payload.readUInt32BE(0);

                const currentSeed = Math.floor(Date.now() / 10000);
                let isValid = false;
                for (let offset = -6; offset <= 6; offset++) {
                  const checkSeed = currentSeed + offset;
                  const expected = (checkSeed ^ 0x53544152) + 0x1337;
                  if (received === expected) {
                    isValid = true;
                    break;
                  }
                }

                if (isValid) {
                  client.authenticatedHandshake = true;
                  client.log("Handshake successful!");
                  continue; 
                } else {
                  client.errLog("Failed Handshake");
                  return client.destroy();
                }
              } else {
                return client.destroy();
              }
            }

            let decryptedPayload = client.crypto.decrypt(messageHeader.id, messageHeader.payload);
            await MessageHandler.handle(messageHeader.id, decryptedPayload, client, client.player, client.database);
          }
        } catch (error) {
          client.errLog(`Packet handling error: ${error.message}`);
        }
      });

      function handleDisconnect(reason) {
        if (client._disconnected) return;
        client._disconnected = true;
        client.log(`Disconnected (${reason})`);
        global.connectionCount--;

        let count = ipConnectionMap.get(ip) || 1;
        ipConnectionMap.set(ip, count - 1);

        let idx = global.clients.indexOf(client);
        if (idx !== -1) global.clients.splice(idx, 1);

        client.destroy();
      }

      client.on('end', () => handleDisconnect('end'));
      client.on('timeout', () => handleDisconnect('timeout'));
      client.on('error', (error) => {
        client.errLog(error.message || error);
        handleDisconnect('error');
      });


    });
    server.once('listening', () => {
      console.log(`[SERVER] >> Listening on port ${config.port}`)
    })
    server.listen(config.port)
  }
}

module.exports = socketserver
new socketserver()