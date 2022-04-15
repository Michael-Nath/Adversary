/**
 * @author Michael D. Nath, Kenan Hasanaliyev, Gabriel Greenstein
 * @email mnath@stanford.edu, kenanhas@stanford.edu, gbg222@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
// Include Nodejs' net module.
const Net = require("net");

import * as Utils from "./utils";
import * as Discovery from "./discovery";
import { nanoid } from 'nanoid'


export function startClient() {
	globalThis.connections.forEach((peer) => {
		// Create a new TCP client.
		const client = new Net.Socket();
		client.id = nanoid()
		globalThis.peerStatuses[client.id] = { buffer: "" };
		
		
		// Send a connection request to the server.
		client.connect({ port: Utils.PORT, host: peer }, () =>
			Discovery.connectToNode(client)
		);
		// // The client can also receive data from the server by reading from its socket.
		// TODO: Should be updated to match server.ts implentation of data event
		client.on("data", (chunk) => {
			const fullString = chunk.toString()
			const msgs = fullString.split("\n");
			if (!fullString.includes("\n")) {
				Utils.sanitizeString(client, fullString, false)
			} else {
				for (let i = 0; i < msgs.length; i++) {
					const msg = msgs[i]
					if (i == 0) {
						const completedMessage = Utils.sanitizeString(client, msg, true)
						
						
						Utils.routeMessage(completedMessage, client, client.address()["address"]);
					}else if (i == msgs.length - 1) {
						msg != "" && Utils.sanitizeString(client, msg, false)
					}else {
						
						
						Utils.routeMessage(msg, client, client.address()["address"]);
					}
				}
			}
		});
		client.on("end", function () {
			
			globalThis.connections.delete(client.id)
		});
		client.on("error", function (err) {
			
		});
	});
}
