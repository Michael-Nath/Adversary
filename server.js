"use strict";
exports.__esModule = true;
exports.startServer = void 0;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
var nanoid_1 = require("nanoid");
var canonicalize = require("canonicalize");
function startServer() {
    var server = new Net.Server();
    globalThis.peers = Discovery.obtainBootstrappingPeers();
    globalThis.peerStatuses = {};
    globalThis.peers.forEach(function (peer) {
        globalThis.peerStatuses[peer] = { buffer: "" };
    });
    server.listen(Utils.PORT, function () {
        console.log("Server listening for connection requests on socket localhost:".concat(Utils.PORT, "."));
    });
    server.on("connection", function (socket) {
        console.log("A new connection has been established.");
        console.log(globalThis.peers);
        socket.id = (0, nanoid_1.nanoid)();
        globalThis.peerStatuses[socket.id] = { buffer: "" };
        socket.write(canonicalize(Utils.HELLO_MESSAGE) + "\n");
        Discovery.getPeers(socket);
        socket.on("data", function (chunk) {
            var fullString = chunk.toString();
            var msgs = fullString.split("\n");
            console.log("MSGS: ", msgs);
            if (!fullString.includes("\n")) {
                Utils.sanitizeString(socket, fullString, false);
            }
            else {
                for (var i = 0; i < msgs.length; i++) {
                    var msg = msgs[i];
                    if (i == 0) {
                        var completedMessage = Utils.sanitizeString(socket, msg, true);
                        console.log("COMPLETED MESSAGE:");
                        console.log(completedMessage);
                        Utils.routeMessage(completedMessage, socket, socket.address()["address"]);
                    }
                    else if (i == msgs.length - 1) {
                        msg != "" && Utils.sanitizeString(socket, msg, false);
                    }
                    else {
                        Utils.routeMessage(msg, socket, socket.address()["address"]);
                    }
                }
            }
        });
        socket.on("end", function () {
            console.log("Closing connection with the client");
            console.log(globalThis.peers);
        });
        socket.on("error", function (err) {
            console.log("Error: ".concat(err));
        });
    });
}
exports.startServer = startServer;
//# sourceMappingURL=server.js.map