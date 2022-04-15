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
import { nanoid } from 'nanoid'
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
			console.log("GOSSIPING TO PEER AT:")
			console.log(peerString)
			const peerToInformConnection = new Net.Socket();

			peerToInformConnection.id = nanoid()
			globalThis.peerStatuses[peerToInformConnection.id] = { buffer: "" };
				peerToInformConnection.connect({ port: Utils.PORT, host: peerString }, () => {
					peerToInformConnection.write(Utils.HELLO_MESSAGE + "\n");
					peerToInformConnection.write(canonicalize({type: "ihaveobject", objectid: hashOfObject}) + "\n");
					setTimeout(async () => {peerToInformConnection.end();}, 5000);
				});
				peerToInformConnection.on("error", function (err) {
					console.log(`Error: ${err}`);
				});
				peerToInformConnection.on("data", (chunk) => {
					const fullString = chunk.toString()
					const msgs = fullString.split("\n");
					// console.log("MSGS: ", msgs)
					if (!fullString.includes("\n")) {
						Utils.sanitizeString(peerToInformConnection, fullString, false)
					} else {
						for (let i = 0; i < msgs.length; i++) {
							const msg = msgs[i]
							if (i == 0) {
								const completedMessage = Utils.sanitizeString(peerToInformConnection, msg, true)
								console.log("COMPLETED CLIENT MESSAGE:");
								console.log(completedMessage)
								Utils.routeMessage(completedMessage, peerToInformConnection, peerToInformConnection.address()["address"]);
							}else if (i == msgs.length - 1) {
								msg != "" && Utils.sanitizeString(peerToInformConnection, msg, false)
							}else {
								console.log("RECEIVED MSG:")
								console.log(msg)
								Utils.routeMessage(msg, peerToInformConnection, peerToInformConnection.address()["address"]);
							}
						}
					}
				});
		}
	})();
}

export function retrieveObject(socket: Net.Socket, response: Object) {
	const hash = response["data"]["objectid"];
	console.log("THE HASH RESPONSE MSG:")
	console.log(response);
	(async () => {
		const doesHashExist = (await Utils.doesHashExist(hash))["exists"]
		if (!doesHashExist) {
			const getObjectMessage: Types.HashObjectMessage = {type: "getobject", objectid: hash}
			socket.write(canonicalize(getObjectMessage) + "\n")
	   }
	})();
}

export function sendObject(socket: Net.Socket, response: Object) {
	const hash = response["data"]["objectid"];
	console.log("THE HASH RESPONSE MSG:")
	console.log(response);
	(async () => {
		const hashResponse = await Utils.doesHashExist(hash)
		console.log(hashResponse);
		if (hashResponse["exists"]) {
			const objectMessage: Types.ObjectMessage = {type: "object", object: hashResponse["obj"]}
			socket.write(canonicalize(objectMessage) + "\n")
		}
	})();
}

export function addObject(socket: Net.Socket, response: Object, withObject: boolean) {
	let obj = response["data"]
	if (withObject) {
		obj = obj["object"];
	}
	//TODO: VERIFY OBJECT
	(async () => {
		const hashResponse = await Utils.doesHashExist(createObjectID(obj))
		console.log("DOES HASH EXIST RESPONSE");
		console.log(hashResponse)
		
		const validationResponse = Utils.validateTransaction(obj)
		const isValidTransaction: boolean = obj["type"] == "transaction" && (validationResponse["valid"] || obj["inputs"] == undefined);

		if(!hashResponse["exists"] && (isValidTransaction || obj["type"] == "block")) {
			gossipObject(obj);
		}else if (obj["type"] == "transaction" && !(obj["inputs"] == undefined) && !isValidTransaction) {
			Utils.sendErrorMessage(socket, validationResponse["msg"])
		}
		Utils.updateDBWithObject(obj);
	})();
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
