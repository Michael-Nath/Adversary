"use strict";
exports.__esModule = true;
exports.obtainBootstrappingPeers = exports.sendPeers = exports.updatePeers = exports.getPeers = exports.getHelloFromPeer = exports.getHelloMessage = exports.getDataFromNode = exports.connectToNode = void 0;
var Utils = require("./utils");
var fs = require("fs");
var path = require("path");
var canonicalize = require("canonicalize");
function connectToNode(client) {
    console.log("TCP connection established with the server.");
    console.log(globalThis.peerStatuses);
    var helloMessage = {
        type: "hello",
        version: "0.8.0",
        agent: "Adversary Node"
    };
    client.write(canonicalize(helloMessage));
}
exports.connectToNode = connectToNode;
function getDataFromNode(client, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if ((!globalThis.peerStatuses[peer] || false) &&
        !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        client.write(canonicalize(errorMessage));
        client.end();
    }
    else {
        (!globalThis.peerStatuses[peer] || false) &&
            client.write(canonicalize({
                type: "acknowledgement",
                message: "Client has received server message"
            }));
        globalThis.peerStatuses[peer] = true;
    }
    console.log("Data received from the server: ".concat(chunk.toString(), "."));
    console.log(globalThis.peerStatuses);
}
exports.getDataFromNode = getDataFromNode;
function getHelloMessage(socket, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if (!globalThis.peerStatuses[peer] && !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        socket.write(canonicalize(errorMessage));
        socket.end();
    }
    else {
        globalThis.peerStatuses[peer] = true;
    }
    console.log("Data received from the server: ".concat(chunk.toString(), "."));
    console.log(globalThis.peerStatuses);
}
exports.getHelloMessage = getHelloMessage;
function getHelloFromPeer(socket, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if (!globalThis.serverPeerStatusses[peer] &&
        !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        socket.write(canonicalize(errorMessage));
        socket.destroy();
    }
    else {
        globalThis.serverPeerStatuses[peer] = true;
    }
}
exports.getHelloFromPeer = getHelloFromPeer;
function getPeers(socket) {
    var getPeersMessage = {
        type: "getpeers"
    };
    socket.write(canonicalize(getPeersMessage));
}
exports.getPeers = getPeers;
function updatePeers(socket, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    if (response["error"]) {
        Utils.sendErrorMessage(socket, response["error"]["error"]);
    }
    if (response["data"]["type"] != "peers")
        return;
    var newPeers = response["data"]["peers"];
    newPeers.forEach(function (newPeer) {
        globalThis.peers.add(newPeer);
    });
    console.log(globalThis.peers);
}
exports.updatePeers = updatePeers;
function sendPeers(client, peer, chunk) {
    var response = Utils.validateMessage(chunk.toString());
    console.log(response);
    if (response["error"]) {
        Utils.sendErrorMessage(client, response["error"]["error"]);
    }
    if (response["data"]["type"] != "getpeers")
        return;
    var peersArray = [];
    globalThis.peers.forEach(function (peer) {
        peersArray.push("".concat(peer, ":").concat(Utils.PORT));
    });
    var peersMessage = {
        type: "peers",
        peers: peersArray
    };
    client.write(canonicalize(peersMessage));
}
exports.sendPeers = sendPeers;
function obtainBootstrappingPeers() {
    try {
        var data = fs.readFileSync(path.join(__dirname, "peers.txt"), {
            encoding: "utf8"
        });
        return new Set(data.split(/\r?\n/));
    }
    catch (err) {
        console.error(err);
        return;
    }
}
exports.obtainBootstrappingPeers = obtainBootstrappingPeers;
//# sourceMappingURL=discovery.js.map