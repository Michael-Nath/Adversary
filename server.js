"use strict";
exports.__esModule = true;
exports.startServer = void 0;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
var canonicalize = require("canonicalize");
function startServer() {
    globalThis.serverPeerStatusses = {};
    var server = new Net.Server();
    server.listen(Utils.PORT, function () {
        console.log("Server listening for connection requests on socket localhost:".concat(Utils.PORT, "."));
    });
    server.on("connection", function (socket) {
        console.log("A new connection has been established.");
        var helloMessage = {
            type: "hello",
            version: "0.8.0",
            agent: "test agent"
        };
        socket.write(canonicalize(helloMessage));
        socket.on("data", function (chunk) {
            return Discovery.getHello(socket, socket.address["address"], chunk, false);
        });
        socket.on("data", function (chunk) { return Discovery.updatePeers(socket, chunk); });
        socket.on("end", function () {
            console.log("Closing connection with the client");
        });
        socket.on("error", function (err) {
            console.log("Error: ".concat(err));
        });
    });
}
exports.startServer = startServer;
//# sourceMappingURL=server.js.map