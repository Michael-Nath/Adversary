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
import { listenerCount } from "process";
import { createObjectID } from "./blockUtils";
const canonicalize = require("canonicalize");

// The port number and hostname of the server.
declare global {
	var peerStatuses: {};
}

export function connectToNode(client: Net.Socket) {
	console.log("TCP connection established with the server.");
	client.write(Utils.HELLO_MESSAGE + "\n");
	getPeers(client);
}

export function getHello(
	socket: Net.Socket,
	peer: string,
	response: Object,
) {
	let connectionExists;
	connectionExists = peer in globalThis.connections;

	if (!connectionExists && !Utils.isValidFirstMessage(response)) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		socket.write(canonicalize(errorMessage) + "\n");
		socket.destroy();
	} else {
		(async () => {
			const newPeerEntry = {};
			newPeerEntry[peer] = [];
			globalThis.connections.add(socket.id);
			await Utils.DB.merge("peers", newPeerEntry);
		})();
	}
}

export function getPeers(socket: Net.Socket) {
	const getPeersMessage = {
		type: "getpeers",
	};
	socket.write(canonicalize(getPeersMessage) + "\n");
}

export function updatePeers(socket: Net.Socket, response: Object) {
	async () => {console.log("PEER COUNT BEFORE UPDATE:"); console.log(Object.keys(await Utils.DB.get("peers")).length)};
	const newPeers: Array<string> = response["data"]["peers"];
	Utils.updateDBWithPeers(newPeers);
	setTimeout(async () => {console.log("PEER COUNT AFTER UPDATE:"); console.log(Object.keys(await Utils.DB.get("peers")).length)}, 5000);
}

export function sendPeers(client: Net.Socket, response: Object) {
	const peersArray = [];
	let peers;
	(async () => {
		peers = await Utils.DB.get("peers");
		// console.log("PEERS:");
		// console.log(peers);
		for (let peer in peers) {
			let peerString = peer;
			if (!peer.includes(":")) peerString += `:${Utils.PORT}`;
			peersArray.push(peerString);
		}
		const peersMessage = {
			type: "peers",
			peers: peersArray,
		};
		client.write(canonicalize(peersMessage) + "\n");
	})();
}

export function gossipObject(obj: Types.Block | Types.Transaction) {
	const hashOfObject = createObjectID(obj);
	let peers;
	(async () => {
		peers = await Utils.DB.get("peers");
		for (let peer in peers) {
			let peerString = peer;
			if (peer.includes(":")) peerString = peer.split(":")[0];

			const peerToInformConnection = new Net.Socket();
			try {
				peerToInformConnection.connect({ port: Utils.PORT, host: peerString }, () => {
					peerToInformConnection.write(canonicalize({type: "ihaveobject", objectid: hashOfObject}) + "\n");
					peerToInformConnection.end();
				});
			} catch (err) {
				console.error(err);
			}	
		}
	})();
}

export function retrieveObject(socket: Net.Socket, response: Object) {
	const hash = response["data"]["objectid"];
	(async () => {
		const doesHashExist = (await Utils.doesHashExist(hash))["exists"]
		if (!doesHashExist) {
			const getObjectMessage: Types.HashObjectMessage = {type: "getobject", hash: hash}
			socket.write(canonicalize(getObjectMessage) + "\n")
	   }
	})();
}

export function sendObject(socket: Net.Socket, response: Object) {
	const hash = response["data"]["objectid"];

	(async () => {
		const hashResponse = await Utils.doesHashExist(hash)
		console.log(hashResponse);
		if (hashResponse["exists"]) {
			const objectMessage: Types.ObjectMessage = {type: "object", object: hashResponse["obj"]}
			socket.write(canonicalize(objectMessage) + "\n")
		}
	})();
}

export function addObject(socket: Net.Socket, response: Object) {
	const obj = response["data"]["object"];
	Utils.updateDBWithObject(obj)
	//TODO: VERIFY OBJECT
	gossipObject(obj);
} 

export function obtainBootstrappingPeers(): Set<string> | void {
	try {
		const data = fs.readFileSync(path.join(__dirname, "../peers.txt"), {
			encoding: "utf8",
		});
		return new Set(data.split(/\r?\n/));
	} catch (err) {
		console.error(err);
		return;
	}
}
