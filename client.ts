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

globalThis.peers = Discovery.obtainBootstrappingPeers() as Set<string>;

export function startClients() {
	globalThis.peerStatuses = {};
	globalThis.peers = Discovery.obtainBootstrappingPeers() as Set<string>;
	console.log(peers);
	globalThis.peers.forEach((peer) => {
		globalThis.peerStatuses[peer] = false;
		// Create a new TCP client.
		const client = new Net.Socket();
		client.id = nanoid()
		// Send a connection request to the server.
		client.connect({ port: Utils.PORT, host: peer }, () =>
			Discovery.connectToNode(client)
		);
		// // The client can also receive data from the server by reading from its socket.
		// TODO: Should be updated to match server.ts implentation of data event
		client.on("data", (chunk) => {
			const msgs = chunk.toString().split("\n");
			console.log("MSGS: ", msgs)
			if (!chunk.toString().includes("\n")) {
				Utils.sanitizeString(client, chunk.toString(), false)
			} else {
				msgs.forEach((msg) => {
					msg != "" &&
						Utils.routeMessage(msg, client, client.address()["address"]);
				});
			}
		});
		client.on("end", function () {
			console.log("Requested an end to the TCP connection");
		});
	});
}
