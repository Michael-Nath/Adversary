"use strict";
exports.__esModule = true;
var Net = require("net");
var Utils = require("./utils");
var canonicalize = require("canonicalize");
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
    var firstMessageHello = false;
    socket.write(canonicalize(helloMessage));
    socket.on("data", function (chunk) {
        var response = Utils.validateMessage(chunk.toString());
        console.log(response);
        if (!response["valid"]) {
            socket.write(canonicalize(response["error"]));
            socket.destroy();
        }
        else {
            if (!firstMessageHello && !Utils.isValidFirstMessage(response)) {
                var errorMessage = {
                    type: "error",
                    error: Utils.HELLO_ERROR
                };
                socket.write(canonicalize(errorMessage));
                socket.destroy();
            }
            else {
                firstMessageHello = true;
            }
        }
        console.log("Data received from client: ".concat(JSON.stringify(response["data"])));
    });
    socket.on("end", function () {
        console.log("Closing connection with the client");
    });
    socket.on("error", function (err) {
        console.log("Error: ".concat(err));
    });
});
//# sourceMappingURL=server.js.map