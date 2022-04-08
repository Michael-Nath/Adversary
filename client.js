"use strict";
exports.__esModule = true;
exports.startClients = void 0;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
globalThis.peers = Discovery.obtainBootstrappingPeers();
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
        client.on("data", function (chunk) {
            var msgs = chunk.toString().split("\n");
            console.log("MSGS: ", msgs);
            if (!chunk.toString().includes("\n")) {
                Utils.sanitizeChunk(client, "localhost", chunk);
            }
            else {
                msgs.forEach(function (msg) {
                    msg != "" &&
                        Utils.routeMessage(msg, client, true, client.address()["address"]);
                });
            }
        });
        client.on("end", function () {
            console.log("Requested an end to the TCP connection");
        });
    });
}
exports.startClients = startClients;
//# sourceMappingURL=client.js.map