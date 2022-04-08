"use strict";
exports.__esModule = true;
var client_1 = require("./client");
var Utils = require("./utils");
var Discovery = require("./discovery");
globalThis.peers = Discovery.obtainBootstrappingPeers();
Utils.updateDBWithPeers(false, globalThis.peers);
(0, client_1.startClient)();
//# sourceMappingURL=master.js.map