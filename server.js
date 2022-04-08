"use strict";
exports.__esModule = true;
exports.startServer = void 0;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
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
        var helloMessage = {
            type: "hello",
            version: "0.8.0",
            agent: "test agent"
        };
        socket.write(canonicalize(helloMessage) + "\n");
        Discovery.getPeers(socket);
        socket.on("data", function (chunk) {
            var msgs = chunk.toString().split("\n");
            console.log("MSGS: ", msgs);
            if (!chunk.toString().includes("\n")) {
                Utils.sanitizeChunk(socket, "localhost", chunk);
            }
            else {
                msgs.forEach(function (msg) {
                    msg != "" &&
                        Utils.routeMessage(msg, socket, false, socket.address()["address"]);
                });
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