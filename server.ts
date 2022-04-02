import * as Net from "net";
const PORT = 18018;
// only two kinds of messages should be allowed - those representing transactions or blocks
const ALLOWABLE_TYPES: Set<string> = new Set(["transaction", "block"]);

// Use net.createServer() in your code. This is just for illustration purpose.
// Create a new TCP server.
const server: Net.Server = new Net.Server();
// The server listens to a socket for a client to make a connection request.
// Think of a socket as an end point.
server.listen(PORT, function () {
	console.log(
		`Server listening for connection requests on socket localhost:${PORT}.`
	);
});

// When a client requests a connection with the server, the server creates a new
// socket dedicated to that client.
server.on("connection", function (socket) {
	console.log("A new connection has been established.");

	// Now that a TCP connection has been established, the server can send data to
	// the client by writing to its socket.
	socket.write("Hello, client.\n");

	// The server can also receive data from the client by reading from its socket.
	socket.on("data", function (chunk) {
		try {
			const message: JSON = JSON.parse(chunk.toString());
			if (!ALLOWABLE_TYPES.has(message["type"])) {
				socket.write("error: invalid message type.\n");
				socket.destroy();
			}
			console.log(`Data received from client: ${JSON.stringify(message)}`);
		} catch {
			socket.write("error: invalid message format. \n");
			socket.destroy();
		}
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
