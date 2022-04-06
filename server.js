"use strict";
exports.__esModule = true;
var Net = require("net");
var Utils = require("./utils");
var Discovery = require("./discovery");
var canonicalize = require("canonicalize");
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
    Discovery.getPeers(socket);
    socket.on("data", function (chunk) {
        return Discovery.getHelloFromPeer(socket, socket.address["address"], chunk);
    });
    socket.on("data", function (chunk) {
        return Discovery.updatePeers(socket, chunk);
    });
    socket.on("end", function () {
        console.log("Closing connection with the client");
    });
    socket.on("error", function (err) {
        console.log("Error: ".concat(err));
    });
});
//# sourceMappingURL=server.js.map