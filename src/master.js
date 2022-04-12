"use strict";
exports.__esModule = true;
var client_1 = require("./client");
var server_1 = require("./server");
var Utils = require("./utils");
var Discovery = require("./discovery");
globalThis.connections = Discovery.obtainBootstrappingPeers();
Utils.updateDBWithPeers(globalThis.connections);
globalThis.peerStatuses = {};
(0, server_1.startServer)();
(0, client_1.startClient)();
//# sourceMappingURL=master.js.map