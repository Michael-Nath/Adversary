"use strict";
exports.__esModule = true;
var Net = require("net");
var PORT = 18018;
var ALLOWABLE_TYPES = new Set(["transaction", "block"]);
var server = new Net.Server();
server.listen(PORT, function () {
    console.log("Server listening for connection requests on socket localhost:".concat(PORT, "."));
});
server.on("connection", function (socket) {
    console.log("A new connection has been established.");
    socket.write("Hello, client.\n");
    socket.on("data", function (chunk) {
        try {
            var message = JSON.parse(chunk.toString());
            if (!ALLOWABLE_TYPES.has(message["type"])) {
                socket.write("error: invalid message type.\n");
                socket.destroy();
            }
            console.log("Data received from client: ".concat(JSON.stringify(message)));
        }
        catch (_a) {
            socket.write("error: invalid message format. \n");
            socket.destroy();
        }
    });
    socket.on("end", function () {
        console.log("Closing connection with the client");
    });
    socket.on("error", function (err) {
        console.log("Error: ".concat(err));
    });
});
//# sourceMappingURL=server.js.map