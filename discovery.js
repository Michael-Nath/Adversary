"use strict";
exports.__esModule = true;
exports.obtainBootstrappingPeers = exports.getDataFromNode = exports.connectToNode = void 0;
var Utils = require("./utils");
var fs = require("fs");
var client_1 = require("./client");
var path = require("path");
var canonicalize = require("canonicalize");
function sleep(milliseconds) {
    var start = Date.now();
    while (Date.now() - start < milliseconds)
        ;
}
(0, client_1.smth)();
console.log(globalThis.peerStatuses);
function connectToNode(client) {
    console.log("TCP connection established with the server.");
    var helloMessage = {
        type: "hello",
        version: "0.8.0",
        agent: "Adversary Node"
    };
    client.write(canonicalize(helloMessage));
}
exports.connectToNode = connectToNode;
function getDataFromNode(client, chunk) {
    var firstMessageHello = false;
    var response = Utils.validateMessage(chunk.toString());
    if (!firstMessageHello && !Utils.isValidFirstMessage(response)) {
        var errorMessage = {
            type: "error",
            error: Utils.HELLO_ERROR
        };
        client.write(canonicalize(errorMessage));
        client.end();
    }
    else {
        !firstMessageHello &&
            client.write(canonicalize({
                type: "acknowledgement",
                message: "Client has received server message"
            }));
        firstMessageHello = true;
    }
    console.log("Data received from the server: ".concat(chunk.toString(), "."));
    client.end();
}
exports.getDataFromNode = getDataFromNode;
function obtainBootstrappingPeers() {
    fs.readFile(path.join(__dirname, "peers.txt"), "utf8", function (error, data) {
        if (error) {
            console.error(error);
            return;
        }
        return new Set(data.split(/\r?\n/));
    });
    return;
}
exports.obtainBootstrappingPeers = obtainBootstrappingPeers;
//# sourceMappingURL=discovery.js.map