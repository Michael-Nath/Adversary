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

export function connectToNode(client: Net.Socket) {
	// If there is no error, the server has accepted the request and created a new
	// socket dedicated to us.
	console.log("TCP connection established with the server.");
	console.log(globalThis.peerStatuses);
	// The client can now send data to the server by writing to its socket.
	const helloMessage: Types.HelloMessage = {
		type: "hello",
		version: "0.8.0",
		agent: "Adversary Node",
	};
	// FIRST STEP OF TCP HANDSHAKE - CLIENT SEEKS SERVER EXISTENCE

	client.write(canonicalize(helloMessage));
	// getPeers(client);
}

export function getDataFromNode(
	client: Net.Socket,
	peer: string,
	chunk: Buffer
) {
	// console.log(globalThis.peerStatuses);
	const response: Types.ValidationMessage = Utils.validateMessage(
		chunk.toString()
	);
	// Check if first message is hello
	if (
		(!globalThis.peerStatuses[peer] || false) &&
		!Utils.isValidFirstMessage(response)
	) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		client.write(canonicalize(errorMessage));
		client.end();
	} else {
		// Acknowledge that client read server's hello exactly once
		(!globalThis.peerStatuses[peer] || false) &&
			client.write(
				canonicalize({
					type: "acknowledgement",
					message: "Client has received server message",
				})
			);
		globalThis.peerStatuses[peer] = true;
	}
	// STEP THREE OF TCP HANDSHAKE - CLIENT VERIFIES ITS WRITING FUNCTIONALITY
	console.log(`Data received from the server: ${chunk.toString()}.`);
	console.log(globalThis.peerStatuses);
}

export function getHelloMessage(
	socket: Net.Socket,
	peer: string,
	chunk: Buffer
) {
	const response: Types.ValidationMessage = Utils.validateMessage(
		chunk.toString()
	);
	if (!globalThis.peerStatuses[peer] && !Utils.isValidFirstMessage(response)) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		socket.write(canonicalize(errorMessage));
		socket.end();
	} else {
		globalThis.peerStatuses[peer] = true;
	}
	console.log(`Data received from the server: ${chunk.toString()}.`);
	console.log(globalThis.peerStatuses);
}

export function getHelloFromPeer(
	socket: Net.Socket,
	peer: string,
	chunk: Buffer
) {
	const response: Types.ValidationMessage = Utils.validateMessage(
		chunk.toString()
	);
	if (
		!globalThis.serverPeerStatusses[peer] &&
		!Utils.isValidFirstMessage(response)
	) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		socket.write(canonicalize(errorMessage));
		socket.destroy();
	} else {
		globalThis.serverPeerStatuses[peer] = true;
	}
}

export function getHello(
	socket: Net.Socket,
	peer: string,
	chunk: Buffer,
	weInitiated: boolean
) {
	const response: Types.ValidationMessage = Utils.validateMessage(
		chunk.toString()
	);
	let peerExists;
	const list = weInitiated ? "clientPeers" : "serverPeers";
	(async () => {
		peerExists = peer in (await Utils.DB.get(list));
	})();
	if (!peerExists && !Utils.isValidFirstMessage(response)) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		socket.write(canonicalize(errorMessage));
		socket.destroy();
	} else {
		(async () => {
			const newPeerEntry = {};
			newPeerEntry[peer] = [];
			await Utils.DB.merge(list, newPeerEntry);
		})();
	}
}

export function getPeers(socket: Net.Socket) {
	const getPeersMessage = {
		type: "getpeers",
	};
	socket.write(canonicalize(getPeersMessage));
}

export function updatePeers(socket: Net.Socket, chunk: Buffer) {
	const response: Types.ValidationMessage = Utils.validateMessage(
		chunk.toString()
	);

	if (response["error"]) {
		Utils.sendErrorMessage(socket, response["error"]["error"]);
	}
	if (response["data"]["type"] != "peers") return;
	const newPeers: Array<string> = response["data"]["peers"];
	newPeers.forEach((newPeer) => {
		globalThis.peers.add(newPeer);
	});
	console.log(globalThis.peers);
}
export function sendPeers(client: Net.Socket, peer: string, chunk: Buffer) {
	const response: Types.ValidationMessage = Utils.validateMessage(
		chunk.toString()
	);
	console.log(response);
	if (response["error"]) {
		Utils.sendErrorMessage(client, response["error"]["error"]);
	}
	if (response["data"]["type"] != "getpeers") return;
	const peersArray = [];
	globalThis.peers.forEach((peer) => {
		peersArray.push(`${peer}:${Utils.PORT}`);
	});
	const peersMessage = {
		type: "peers",
		peers: peersArray,
	};
	client.write(canonicalize(peersMessage));
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
