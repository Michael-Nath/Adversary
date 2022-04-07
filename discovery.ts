/**
 * @author Michael D. Nath, Kenan Hasanaliyev, Gabriel Greenstein
 * @email mnath@stanford.edu, kenanhas@stanford.edu, gbg222@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
import * as Net from "net";
import * as Types from "./types";
import * as Utils from "./utils";
import * as fs from "fs";
import * as path from "path";
const canonicalize = require("canonicalize");

// The port number and hostname of the server.
declare global {
	var peerStatuses: {};
	var peers: Set<string>;
}

export function connectToNode(client: Net.Socket) {
	// If there is no error, the server has accepted the request and created a new
	// socket dedicated to us.
	console.log("TCP connection established with the server.");
	// The client can now send data to the server by writing to its socket.
	const helloMessage: Types.HelloMessage = {
		type: "hello",
		version: "0.8.0",
		agent: "Adversary Node",
	};
	// FIRST STEP OF TCP HANDSHAKE - CLIENT SEEKS SERVER EXISTENCE

	client.write(canonicalize(helloMessage)+"\n");
	// getPeers(client);
}

export function getHello(
	socket: Net.Socket,
	peer: string,
	response: Object,
	weInitiated: boolean
) {
	let peerExists;
	const list = weInitiated ? "clientPeers" : "serverPeers";
	(async () => {
		peerExists = peer in globalThis.peers;
	})();
	if (!peerExists && !Utils.isValidFirstMessage(response)) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		socket.write(canonicalize(errorMessage)+"\n");
		socket.destroy();
	} else {
		(async () => {
			const newPeerEntry = {};
			newPeerEntry[peer] = [];
			const helloMessage: Types.HelloMessage = {
				type: "hello",
				version: "0.8.0",
				agent: "Adversary Node",
			};

			if (!peerExists) {
				socket.write(canonicalize(helloMessage)+'\n');
				getPeers(socket);
			}
			await Utils.DB.merge(list, newPeerEntry);
			globalThis.peers.add(peer);
			console.log(globalThis.peers);
			console.log(await Utils.DB.get(list));
		})();
	}
}

export function getPeers(socket: Net.Socket) {
	const getPeersMessage = {
		type: "getpeers",
	};
	socket.write(canonicalize(getPeersMessage)+"\n");
}

export function updatePeers(socket: Net.Socket, response: Object) {
	const newPeers: Array<string> = response["data"]["peers"];
	newPeers.forEach((newPeer) => {
		globalThis.peers.add(newPeer);
	});
}
export function sendPeers(client: Net.Socket, peer: string, response: Object) {
	const peersArray = [];
	// globalThis.peers.forEach((peer) => {
	// 	peersArray.push(`${peer}:${Utils.PORT}`);
	// });
	// const peersMessage = {
	// 	type: "peers",
	// 	peers: peersArray,
	// };
	// client.write(canonicalize(peersMessage)+"\n");
}

export function obtainBootstrappingPeers(): Set<string> | void {
	try {
		const data = fs.readFileSync(path.join(__dirname, "peers.txt"), {
			encoding: "utf8",
		});
		return new Set(data.split(/\r?\n/));
	} catch (err) {
		console.error(err);
		return;
	}
}
