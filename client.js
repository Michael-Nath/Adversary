var Net = require("net");
var PORT = 18018;
var host = "localhost";
var client = new Net.Socket();
client.connect({ port: PORT }, function () {
    console.log("TCP connection established with the server.");
    var exampleMessage = "monkey moo";
    client.write(exampleMessage);
});
client.on("data", function (chunk) {
    console.log("Data received from the server: ".concat(chunk.toString(), "."));
    client.end();
});
client.on("end", function () {
    console.log("Requested an end to the TCP connection");
});
//# sourceMappingURL=client.js.map