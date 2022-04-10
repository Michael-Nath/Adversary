"use strict";
exports.__esModule = true;
exports.startClient = void 0;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
var nanoid_1 = require("nanoid");
function startClient() {
    console.log(peers);
    globalThis.connections.forEach(function (peer) {
        var client = new Net.Socket();
        client.id = (0, nanoid_1.nanoid)();
        globalThis.peerStatuses[client.id] = { buffer: "" };
        console.log("CLIENT ID:");
        console.log(client.id);
        client.connect({ port: Utils.PORT, host: peer }, function () {
            return Discovery.connectToNode(client);
        });
        client.on("data", function (chunk) {
            var fullString = chunk.toString();
            var msgs = fullString.split("\n");
            if (!fullString.includes("\n")) {
                Utils.sanitizeString(client, fullString, false);
            }
            else {
                for (var i = 0; i < msgs.length; i++) {
                    var msg = msgs[i];
                    if (i == 0) {
                        var completedMessage = Utils.sanitizeString(client, msg, true);
                        console.log("COMPLETED MESSAGE:");
                        Utils.routeMessage(completedMessage, client, client.address()["address"]);
                    }
                    else if (i == msgs.length - 1) {
                        msg != "" && Utils.sanitizeString(client, msg, false);
                    }
                    else {
                        console.log("RECEIVED MSG:");
                        console.log(msg);
                        Utils.routeMessage(msg, client, client.address()["address"]);
                    }
                }
            }
        });
        client.on("end", function () {
            console.log("Requested an end to the TCP connection");
            globalThis.connections["delete"](client.id);
        });
    });
}
exports.startClient = startClient;
//# sourceMappingURL=client.js.map