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
import * as Discovery from "./discovery";
const canonicalize = require("canonicalize");

export function startServer() {
	// cononicalize(json) takes in a JSON and returns another JSON

	// Use net.createServer() in your code. This is just for illustration purpose.
	// Create a new TCP server.
	const server: Net.Server = new Net.Server();
	globalThis.peers = Discovery.obtainBootstrappingPeers() as Set<string>;
	globalThis.peerStatuses = {};
	globalThis.peers.forEach((peer) => {
		globalThis.peerStatuses[peer] = { buffer: "" };
	});
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
		console.log(globalThis.peers);
		// Now that a TCP connection has been established, the server can send data to
		// the client by writing to its socket.
		const helloMessage: types.HelloMessage = {
			type: "hello",
			version: "0.8.0",
			agent: "test agent",
		};

		// Discovery.getPeers(socket);

		socket.on("data", (chunk) => {
			const msgs = chunk.toString().split("\n");
			console.log("MSGS: ", msgs)
			if (!chunk.toString().includes("\n")) {
				Utils.sanitizeChunk(socket, "localhost", chunk)
			} else {
				msgs.forEach((msg) => {
					msg != "" &&
						Utils.routeMessage(msg, socket, false, socket.address()["address"]);
				});
			}
		});

		// When the client requests to end the TCP connection with the server, the server
		// ends the connection.
		socket.on("end", function () {
			console.log("Closing connection with the client");
			console.log(globalThis.peers);
		});

		// Don't forget to catch error, for your own sake.
		socket.on("error", function (err) {
			console.log(`Error: ${err}`);
		});
	});
}
