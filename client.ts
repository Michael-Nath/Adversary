// Include Nodejs' net module.
const Net = require("net");
import * as Utils from "./utils";
import * as Types from "./types"
const canonicalize = require("canonicalize");
// The port number and hostname of the server.
const PORT = 18018;
const host = "localhost";
let firstMessageHello = false;
// Create a new TCP client.
const client = new Net.Socket();
// Send a connection request to the server.
client.connect({ port: PORT }, function () {
	// If there is no error, the server has accepted the request and created a new
	// socket dedicated to us.
	console.log("TCP connection established with the server.");

	// The client can now send data to the server by writing to its socket.
	const helloMessage : Types.HelloMessage = {
		type: "hello",
		version: "0.8.0",
		agent: "Adversary Node",
	};
	// FIRST STEP OF TCP HANDSHAKE - CLIENT SEEKS SERVER EXISTENCE

	client.write(canonicalize(helloMessage));
});

// The client can also receive data from the server by reading from its socket.
client.on("data", function (chunk) {
	const response : Types.ValidationMessage = Utils.validateMessage(chunk.toString());
	// Check if first message is hello
	if (!firstMessageHello && !Utils.isValidFirstMessage(response)) {
		const errorMessage : Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		client.write(canonicalize(errorMessage));
		client.end();
	} else {
		// Acknowledge that client read server's hello exactly once
		!firstMessageHello &&
			client.write(
				canonicalize({
					type: "acknowledgement",
					message: "Client has received server message",
				})
			);
		firstMessageHello = true;
	}
	// STEP THREE OF TCP HANDSHAKE - CLIENT VERIFIES ITS WRITING FUNCTIONALITY
	console.log(`Data received from the server: ${chunk.toString()}.`);

	// Request an end to the connection after the data has been received.
	client.end();
});

client.on("end", function () {
	console.log("Requested an end to the TCP connection");
});
