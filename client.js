"use strict";
exports.__esModule = true;
exports.startClients = void 0;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
function startClients() {
    globalThis.peerStatuses = {};
    globalThis.peers = Discovery.obtainBootstrappingPeers();
    console.log(peers);
    globalThis.peers.forEach(function (peer) {
        globalThis.peerStatuses[peer] = false;
        var client = new Net.Socket();
        client.connect({ port: Utils.PORT, host: peer }, function () {
            return Discovery.connectToNode(client);
        });
        client.on("data", function (chunk) { return Discovery.getHello(client, peer, chunk, true); });
        client.on("end", function () {
            console.log("Requested an end to the TCP connection");
        });
    });
}
exports.startClients = startClients;
//# sourceMappingURL=client.js.map