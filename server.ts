/**
 * @author Michael D. Nath, Kenan Hasanaliyev, Gabriel Greenstein
 * @email mnath@stanford.edu, kenanhas@stanford.edu, gbg222@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
import * as Net from "net";
import * as Utils from "./utils";
import * as types from "./types";
const canonicalize = require("canonicalize");

// cononicalize(json) takes in a JSON and returns another JSON

// Use net.createServer() in your code. This is just for illustration purpose.
// Create a new TCP server.
const server: Net.Server = new Net.Server();

// The server listens to a socket for a client to make a connection request.
// Think of a socket as an end point.
server.listen(Utils.PORT, function () {
	console.log(
		`Server listening for connection requests on socket localhost:${Utils.PORT}.`
	);
});

// When a client requests a connection with the server, the server creates a new
// socket dedicated to that client.
server.on("connection", function (socket) {
	console.log("A new connection has been established.");

	// Now that a TCP connection has been established, the server can send data to
	// the client by writing to its socket.
	const helloMessage: types.HelloMessage = {
		type: "hello",
		version: "0.8.0",
		agent: "test agent",
	};
	let firstMessageHello = false;

	// SECOND STEP OF TCP HANDSHAKE - SERVER ACKNOWLEDGES CLIENT'S HELLO
	socket.write(canonicalize(helloMessage));

	// The server can also receive data from the client by reading from its socket.
	socket.on("data", function (chunk) {
		const response: {} = Utils.validateMessage(chunk.toString());
		console.log(response);
		if (!response["valid"]) {
			// End connection if response is invalid
			socket.write(canonicalize(response["error"]));
			socket.destroy();
		} else {
			// Checks if first message is hello or not
			if (!firstMessageHello && !Utils.isValidFirstMessage(response)) {
				const errorMessage: types.ErrorMessage = {
					type: "error",
					error: Utils.HELLO_ERROR,
				};
				// End connection if it isn't
				socket.write(canonicalize(errorMessage));
				socket.destroy();
			} else {
				// Inform future incoming packets that the first message was indeed hello
				firstMessageHello = true;
			}
		}
		console.log(
			`Data received from client: ${JSON.stringify(response["data"])}`
		);
	});

	// When the client requests to end the TCP connection with the server, the server
	// ends the connection.
	socket.on("end", function () {
		console.log("Closing connection with the client");
	});

	// Don't forget to catch error, for your own sake.
	socket.on("error", function (err) {
		console.log(`Error: ${err}`);
	});
});
