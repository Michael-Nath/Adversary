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
import { nanoid } from 'nanoid'
const canonicalize = require("canonicalize");

declare module "net" {
    interface Socket {
        id: string;
    }
}

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
		
		socket.id = nanoid()
		globalThis.peerStatuses[socket.id] = { buffer: "" };
		// Now that a TCP connection has been established, the server can send data to
		// the client by writing to its socket.
		socket.write(canonicalize(Utils.HELLO_MESSAGE) + "\n");
		Discovery.getPeers(socket);

		socket.on("data", (chunk) => {
<<<<<<< HEAD
			const fullString = chunk.toString()
			const msgs = fullString.split("\n");
			console.log("MSGS: ", msgs)
			if (!fullString.includes("\n")) {
				Utils.sanitizeString(socket, "localhost", fullString, false)
=======
			const msgs = chunk.toString().split("\n");
			if (!chunk.toString().includes("\n")) {
				Utils.sanitizeChunk(socket, "localhost", chunk)
>>>>>>> 54fd9c1079308d2b5a91cea87bd33edfed888544
			} else {
				for (let i = 0; i < msgs.length; i++) {
					const msg = msgs[i]
					if (i == 0) {
						const completedMessage = Utils.sanitizeString(socket, "localhost", msg, true)
						console.log("COMPLETED MESSAGE:");
						console.log(completedMessage)
						Utils.routeMessage(completedMessage, socket, false, socket.address()["address"]);
					}else if (i == msgs.length - 1) {
						msg != "" && Utils.sanitizeString(socket, "localhost", msg, false)
					}else {
						Utils.routeMessage(msg, socket, false, socket.address()["address"]);
					}
				}
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
