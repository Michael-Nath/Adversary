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
	handleIncomingValidatedBlock,
	validateBlock,
	validateBlockFormat,
} from "./blockUtils";
import { validateTransaction } from "./transactionUtils";
import { nanoid } from "nanoid";
import { EventEmitter } from "stream";
const canonicalize = require("canonicalize");

declare global {
	var emitter: EventEmitter
	var peerStatuses: {};
	var pendingBlocks: Map<string, Types.PendingBlock>;
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
			globalThis.connections.add(socket.id);
			await db.PEERS.put(peer, []);
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
	(async () => {
		console.log("OBTAINING PEERS AND SENDING");
		db.PEERS.createReadStream().on('data', function(data) {
			let peerString = data.key
			if (!peerString.includes(":")) peerString += `:${Constants.PORT}`;
			peersArray.push(peerString);
		}).on('error', function(err) {
            return console.log('Unable to read data stream!', err)
        }).on('close', function() {
			const peersMessage = {
				type: "peers",
				peers: peersArray,
			};
			client.write(canonicalize(peersMessage) + "\n");
        });
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

async function validateUTXOAndGossipBlock(socket: Net.Socket, block) {
	const blockValidateResponse = await validateBlock(block);
	if (!blockValidateResponse.valid) {
		Utils.sendErrorMessage(socket, blockValidateResponse.msg);
		return;
	}
	console.log("ADDING OBJECT TO DB");
	const processBlockUTXO = await handleIncomingValidatedBlock(block);
	if (!processBlockUTXO.valid) {
		Utils.sendErrorMessage(socket, processBlockUTXO.msg);
		return;
	}
	gossipObject(block);
	db.updateDBWithObject(block);
} 

export async function addObject(socket: Net.Socket, response: Object) {
	const obj = response["data"]["object"];
	(async () => {
		const objectHash = createObjectID(obj);
		if (objectHash == createObjectID(Constants.GENESIS_BLOCK)) {
			return;
		}
		const hashResponse = await db.doesHashExist(objectHash);
		console.log(obj);
		console.log(createObjectID(obj));

		const isCoinbase: boolean = obj["height"] != undefined;
		const isBlock: boolean = obj["type"] == "block";
		// await downloadAllParents(socket, obj)
		if (isCoinbase) {
			if (!hashResponse["exists"]) {
				gossipObject(obj);
				await db.updateDBWithObjectWithPromise(obj);
			}
		} else if (!isBlock) {
			const validationResponse = await validateTransaction(obj);
			const isValidTransaction: boolean =
				obj["type"] == "transaction" &&
				(validationResponse["valid"] || isCoinbase);

			if (!hashResponse["exists"] && isValidTransaction) {
				gossipObject(obj);
				await db.updateDBWithObjectWithPromise(obj);
			} else if (obj["type"] == "transaction" && !isValidTransaction) {
				Utils.sendErrorMessage(socket, validationResponse["msg"]);
				return;
			}
		} else if (isBlock) {
			const blockFormatResponse = validateBlockFormat(obj);
			if (!blockFormatResponse.valid) {
				Utils.sendErrorMessage(socket, blockFormatResponse["msg"]);
				return;
			}
			const correspondingTransactionsResponse =
				await correspondingTransactionsExist(obj["txids"]);

			if (correspondingTransactionsResponse["txids"].size > 0) {
				globalThis.pendingBlocks.set(objectHash, {block: (obj as Types.Block), socket: socket, txids: correspondingTransactionsResponse["txids"]});
				for (let txid of correspondingTransactionsResponse["txids"]) {
					const getObjectMessage: Types.HashObjectMessage = {
						type: "getobject",
						objectid: txid,
					};
					socket.write(canonicalize(getObjectMessage) + "\n");
				}
				setTimeout(async () => {
					if (globalThis.pendingBlocks.has(objectHash) && globalThis.pendingBlocks.get(objectHash).txids.size != 0) {
						globalThis.pendingBlocks.delete(objectHash);
						Utils.sendErrorMessage(
							socket,
							"Did not receive missing transactions in time."
						);
					}
				}, 5000);
			} else {
				validateUTXOAndGossipBlock(socket, obj);
			}
		}
		console.log("OUTPUTTING PENDING BLOCKS");
		console.log(globalThis.pendingBlocks)
		if (!isBlock) {
			for (let [blockid,] of globalThis.pendingBlocks) {
				console.log("PENDING BLOCKS BEFORE");
				console.log(globalThis.pendingBlocks);

				if (globalThis.pendingBlocks.get(blockid).txids.has(objectHash)) {
					console.log("FILLING IN MISSING TRANSACTION");
					globalThis.pendingBlocks.get(blockid).txids.delete(objectHash);
					console.log("PENDING BLOCKS AFTER");
					console.log(globalThis.pendingBlocks);
					if (globalThis.pendingBlocks.get(blockid).txids.size == 0) {;
						validateUTXOAndGossipBlock(globalThis.pendingBlocks.get(blockid).socket, globalThis.pendingBlocks.get(blockid).block).then(() => {globalThis.pendingBlocks.delete(blockid);});
					}
				}
			}
		}
	})();
}

function askForParent(socket, parentid) {
	const getObjectMessage: Types.HashObjectMessage = {
		type: "getobject",
		objectid: parentid,
	};
	socket.write(canonicalize(getObjectMessage) + "\n");
}

// async function downloadAllParents(socket, blockid: Types.Block) {
// 	var currentid = createObjectID(blockid);
// 	var allDownloaded = false;
// 	while (true) {
// 		var exists = false
// 		try {
// 			await db.doesHashExist(block.previd)
// 			exists = true;
// 		} catch {}
// 		if (!exists) {
// 			askForParent(socket, block.previd)
// 			setTimeout(async () => {
// 				try {
// 					await db.doesHashExist(block.previd)
// 					allDownloaded = true;
// 				} catch {}
// 			}, 5000)
// 		}
// 		if (allDownloaded) break;
// 		else currentid
// 	}
// }

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
