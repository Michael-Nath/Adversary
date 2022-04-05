"use strict";
exports.__esModule = true;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
globalThis.peerStatuses = {};
globalThis.peers =
    Discovery.obtainBootstrappingPeers();
console.log(peers);
globalThis.peers.forEach(function (peer) {
    globalThis.peerStatuses[peer] = false;
    var client = new Net.Socket();
    client.connect({ port: Utils.PORT, host: peer }, function () {
        return Discovery.connectToNode(client);
    });
    client.on("data", function (chunk) { return Discovery.getHelloMessage(client, peer, chunk); });
    client.on("data", function (chunk) { return Discovery.sendPeers(client, peer, chunk); });
    client.on("end", function () {
        console.log("Requested an end to the TCP connection");
    });
});
//# sourceMappingURL=client.js.map