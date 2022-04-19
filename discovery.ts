/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc discovery.ts contains all operations needed to execute successful peer discovery.
 */
import * as Net from "net";
import * as Types from "./types";
import * as Utils from "./utils";
import * as Constants from "./constants";
import * as db from "./db";
import * as fs from "fs";
import * as path from "path";
import {
	correspondingTransactionsExist,
	createObjectID,
	validateBlock,
	validateBlockFormat,
} from "./blockUtils";
import { validateTransaction } from "./transactionUtils";
import { nanoid } from "nanoid";
const canonicalize = require("canonicalize");

declare global {
	var peerStatuses: {};
	var pendingBlocks: Map<string, Set<string>>;
}

export function connectToNode(client: Net.Socket) {
	client.write(Constants.HELLO_MESSAGE + "\n");
	getPeers(client);
}

export function getHello(socket: Net.Socket, peer: string, response: Object) {
	let connectionExists;
	connectionExists = peer in globalThis.connections;

	if (!connectionExists && !Utils.isValidFirstMessage(response)) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Constants.HELLO_ERROR,
		};
		socket.write(canonicalize(errorMessage) + "\n");
		socket.destroy();
	} else {
		(async () => {
			const newPeerEntry = {};
			newPeerEntry[peer] = [];
			globalThis.connections.add(socket.id);
			await db.DB.merge("peers", newPeerEntry);
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
	const newPeers: Array<string> = response["data"]["peers"];
	db.updateDBWithPeers(newPeers);
}

export function sendPeers(client: Net.Socket, response: Object) {
	const peersArray = [];
	let peers;
	(async () => {
		peers = await db.DB.get("peers");
		for (let peer in peers) {
			let peerString = peer;
			if (!peer.includes(":")) peerString += `:${Constants.PORT}`;
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
	(async () => {
		for (let peerToInformConnection of globalThis.sockets) {
			peerToInformConnection.write(
				canonicalize({ type: "ihaveobject", objectid: hashOfObject }) + "\n"
			);
		}
	})();
}

export function retrieveObject(socket: Net.Socket, response: Object) {
	const hash = response["data"]["objectid"];
	(async () => {
		const doesHashExist = (await db.doesHashExist(hash))["exists"];
		if (!doesHashExist) {
			const getObjectMessage: Types.HashObjectMessage = {
				type: "getobject",
				objectid: hash,
			};
			socket.write(canonicalize(getObjectMessage) + "\n");
		}
	})();
}

export function sendObject(socket: Net.Socket, response: Object) {
	const hash = response["data"]["objectid"];

	(async () => {
		const hashResponse = await db.doesHashExist(hash);

		console.log("SENDING OBJECT WITH HASH RESPONSE:");
		console.log(hashResponse);
		console.log(response);

		if (hashResponse["exists"]) {
			const objectMessage: Types.ObjectMessage = {
				type: "object",
				object: hashResponse["obj"],
			};
			socket.write(canonicalize(objectMessage) + "\n");
		}
	})();
}

export async function addObject(socket: Net.Socket, response: Object) {
	const obj = response["data"]["object"];
	(async () => {
		const objectHash = createObjectID(obj);
		const hashResponse = await db.doesHashExist(objectHash);
		let stillMissingTransactions = false;
		console.log("ADDING OBJECT WITH RESPONSE:");
		console.log(hashResponse);
		console.log(obj);
		console.log(createObjectID(obj));

		const isCoinbase: boolean = obj["height"] != undefined;
		const isBlock: boolean = obj["type"] == "block";
		if (!isBlock) {
			for (let blockid in globalThis.pendingBlocks) {
				if (globalThis.pendingBlocks[blockid].has(objectHash)) {
					globalThis.pendingBlocks[blockid].delete(objectHash);
				}
			}
		}
		if (!isCoinbase && !isBlock) {
			const validationResponse = await validateTransaction(obj);
			const isValidTransaction: boolean =
				obj["type"] == "transaction" &&
				(validationResponse["valid"] || obj["height"] != undefined);

			if (!hashResponse["exists"] && isValidTransaction) {
				gossipObject(obj);
			} else if (obj["type"] == "transaction" && !isValidTransaction) {
				Utils.sendErrorMessage(socket, validationResponse["msg"]);
			}
		} else {
			if (!hashResponse["exists"]) {
				gossipObject(obj);
			}
		}

		if (isBlock) {
			const blockFormatResponse = validateBlockFormat(obj);
			if (!blockFormatResponse.valid) {
				Utils.sendErrorMessage(socket, blockFormatResponse["msg"]);
				return;
			}
			const correspondingTransactionsResponse =
				await correspondingTransactionsExist(obj["txids"]);
			if (correspondingTransactionsResponse["txids"].size > 0) {
				globalThis.pendingBlocks[objectHash] =
					correspondingTransactionsResponse["txids"];
				for (let txid of correspondingTransactionsResponse["txids"]) {
					const getObjectMessage: Types.HashObjectMessage = {
						type: "getobject",
						objectid: txid,
					};
					socket.write(canonicalize(getObjectMessage) + "\n");
				}
			} 
			setTimeout(() => {
				if (globalThis.pendingBlocks[objectHash].size != 0) {
					stillMissingTransactions = true;
				}
			}, 5000);
			if (stillMissingTransactions) {
				Utils.sendErrorMessage(
					socket,
					"Did not receive missing transactions in time."
				);
				return;
			}
			const blockValidateResponse = await validateBlock(obj);
			if (!blockValidateResponse.valid) {
				Utils.sendErrorMessage(socket, blockValidateResponse.msg);
				return;
			}
			gossipObject(obj);
		}
		db.updateDBWithObject(obj);
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
