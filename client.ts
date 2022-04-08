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
import * as Types from "./types";
import * as Discovery from "./discovery";

globalThis.peers = Discovery.obtainBootstrappingPeers() as Set<string>;

export function startClients() {
	globalThis.peerStatuses = {};
	globalThis.peers = Discovery.obtainBootstrappingPeers() as Set<string>;
	console.log(peers);
	globalThis.peers.forEach((peer) => {
		globalThis.peerStatuses[peer] = false;
		// Create a new TCP client.
		const client = new Net.Socket();
		// Send a connection request to the server.
		client.connect({ port: Utils.PORT, host: peer }, () =>
			Discovery.connectToNode(client)
		);
		// // The client can also receive data from the server by reading from its socket.
		client.on("data", (chunk) => Discovery.getHello(client, peer, chunk, true));
		// client.on("data", (chunk) => Discovery.sendPeers(client, peer, chunk));
		// client.on("data", (chunk) => Discovery.updatePeers(client, chunk));
		// client.on("data", (chunk) => console.log(chunk.toString()));
		client.on("end", function () {
			console.log("Requested an end to the TCP connection");
		});
	});
}
