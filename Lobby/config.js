var args = require('minimist')(process.argv.slice(2));
var extend = require('extend');

var environment = args.env || "dev";


var common_conf = {
    name: "lunarbrawl",
    version: "0.0.2",
    environment: environment,
    max_player: 50,

};

var conf = {
    production: {
        ip: args.ip || "0.0.0.0",
        port: args.port || 9339,
        database: "mongodb://127.0.0.1:27017/lunarbrawl_prod",
        maxQueueSize: 1024,
        sessionTimeoutSeconds: 15,
        shopRefreshSeconds: 20,
        adminSecret: "super_secret_admin_key_prod"
    },

    dev: {
        ip: args.ip || "0.0.0.0",
        port: args.port || 9339,
        database: "mongodb://127.0.0.1:27017/lunarbrawl_dev",
        maxQueueSize: 1024,
        sessionTimeoutSeconds: 20,
        shopRefreshSeconds: 300,
        adminSecret: "admin"
    }
};

extend(false, conf.production, conf.common_conf);
extend(false, conf.dev, conf.common_conf);

module.exports = config = conf[environment];