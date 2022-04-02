// Include Nodejs' net module.
const Net = require("net");
// The port number and hostname of the server.
const PORT = 18018;
const host = "localhost";

// Create a new TCP client.
const client = new Net.Socket();
// Send a connection request to the server.
client.connect({ port: PORT }, function () {
	// If there is no error, the server has accepted the request and created a new
	// socket dedicated to us.
	console.log("TCP connection established with the server.");

	// The client can now send data to the server by writing to its socket.
	// const exampleMessage = { type: "monkey", inputs: "blah" };
	const exampleMessage = "monkey moo";
	client.write(exampleMessage);
	// client.write(JSON.stringify(exampleMessage));
});

// The client can also receive data from the server by reading from its socket.
client.on("data", function (chunk) {
	console.log(`Data received from the server: ${chunk.toString()}.`);

	// Request an end to the connection after the data has been received.
	client.end();
});

client.on("end", function () {
	console.log("Requested an end to the TCP connection");
});
