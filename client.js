"use strict";
exports.__esModule = true;
var Net = require("net");
var Utils = require("./utils");
var canonicalize = require("canonicalize");
var PORT = 18018;
var host = "localhost";
var firstMessageHello = false;
var client = new Net.Socket();
client.connect({ port: PORT }, function () {
    console.log("TCP connection established with the server.");
    var helloMessage = {
        type: "hello",
        version: "0.8.0",
        agent: "Adversary Node"
    };
    client.write(canonicalize(helloMessage));
});
client.on("data", function (chunk) {
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
});
client.on("end", function () {
    console.log("Requested an end to the TCP connection");
});
//# sourceMappingURL=client.js.map