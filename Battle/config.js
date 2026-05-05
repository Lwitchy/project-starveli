module.exports = {
  udp: {
    port: process.env.BATTLE_UDP_PORT || 9338,
    host: '0.0.0.0'
  },

  http: {
    port: process.env.BATTLE_HTTP_PORT || 9340,
    host: '0.0.0.0'
  },

  battle: {
    id: process.env.BATTLE_SERVER_ID || 'battle-1',
    maxPlayers: 4,
    maxActiveBattles: 100,
    tickRate: 20, // Ticks per second (50ms per tick)
    sessionTimeout: 60000 // 60 seconds
  },

  // Logging
  logging: {
    level: 'info' // 'debug', 'info', 'warn', 'error'
  }
};
