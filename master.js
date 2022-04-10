"use strict";
exports.__esModule = true;
var client_1 = require("./client");
var server_1 = require("./server");
var Utils = require("./utils");
var Discovery = require("./discovery");
globalThis.peers = Discovery.obtainBootstrappingPeers();
Utils.updateDBWithPeers(false, globalThis.peers);
globalThis.peerStatuses = {};
(0, client_1.startClient)();
(0, server_1.startServer)();
//# sourceMappingURL=master.js.map