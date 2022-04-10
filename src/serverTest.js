"use strict";
exports.__esModule = true;
var Net = require("net");
var canonicalize = require("canonicalize");
var port = 18018;
var host = "localhost";
var grader = new Net.Socket();
var helloMessage = {
    type: "hello",
    version: "0.8.0",
    agent: "Grader Node"
};
var peersMessage = {
    type: "peers",
    peers: ["dionyziz.com:18018"]
};
grader.connect({ port: port, host: host }, function () {
    grader.write(canonicalize(helloMessage) + '\n');
    grader.write("{\"type\":\"ge");
    setTimeout(function () { grader.write("tpeers\"}\n{\"type\":\"getpeers\"}\n"); }, 3000);
});
grader.on("data", function (chunk) {
    console.log("received from server: ".concat(chunk.toString()));
});
//# sourceMappingURL=serverTest.js.map