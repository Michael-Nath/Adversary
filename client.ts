/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @file client.ts
 * @desc client.ts handles connections that this node initiates with other peers 
 */

const Net = require("net");

import * as Utils from "./utils";
import * as CONSTANTS from "./constants";
import * as Discovery from "./discovery";
import { nanoid } from "nanoid";

export function startClient(msg?: string) {
	// Iterate through list of desired connections and connect to them
	globalThis.connections.forEach((peer) => {
		// Initialize a new TCP client with a random ID and message buffer
		const client = new Net.Socket();
		client.id = nanoid();
		globalThis.peerStatuses[client.id] = { buffer: "" };
		globalThis.sockets.add(client);

		// Send a connection request to the desired server.
		client.connect({ port: CONSTANTS.PORT, host: peer }, () =>
			Discovery.connectToNode(client, msg)
		);

		// The client can also receive data from the server by reading from its socket.
		client.on("data", (chunk) => {
			const fullString = chunk.toString();
			if (fullString.length < 1000) {
				console.log("Incoming message to client:");
				console.log(fullString);
				console.log("------------------------");
			}

			// Split string by newline character
			const msgs = fullString.split("\n");

			if (!fullString.includes("\n")) {
				// If no new line, then the string must be added to buffer as it does not complete a valid message
				Utils.sanitizeString(client, fullString, false);
			} else {
				// Otherwise, we can iterate over strings between newline characters to get potentially multiple messages
				for (let i = 0; i < msgs.length; i++) {
					const msg = msgs[i];
					// First message may be completing an existing buffer
					if (i == 0) {
						const completedMessage = Utils.sanitizeString(client, msg, true);
						Utils.routeMessage(
							completedMessage,
							client,
							client.address()["address"]
						);
					} else if (i == msgs.length - 1) {
						// The final message may not be complete, so we pass in false to sanitizeString
						msg != "" && Utils.sanitizeString(client, msg, false);
					} else {
						// Route a complete message to be acted upon
						Utils.routeMessage(msg, client, client.address()["address"]);
					}
				}
			}
		});
		client.on("end", function () {
			globalThis.connections.delete(client.id);
			globalThis.sockets.delete(client);
		});
		client.on("error", function (err) {
			console.error(err);
		});
	});
}
