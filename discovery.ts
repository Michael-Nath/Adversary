/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @file discovery.ts
 * @desc discovery.ts contains all operations needed to execute successful peer discovery.
 */

import * as Net from "net";
import * as Types from "./types";
import * as Utils from "./utils";
import * as CONSTANTS from "./constants";
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
import { EventEmitter } from "stream";
import {
	addBlockToMempool,
	applyTransactionToUTXO,
	filterInvalidMempoolTransactions,
	removeBlockFromMempool,
} from "./utxoUtils";
const canonicalize = require("canonicalize");

declare global {
	var emitter: EventEmitter;
	var peerStatuses: {};
	var pendingBlocks: Map<string, Types.PendingBlock>;
	var chainTip: Types.ChainTip;
	var mempool: Array<string>;
	var mempoolState: Array<Types.Outpoint>;
}

export function connectToNode(client: Net.Socket, msg?: string) {
	client.write(CONSTANTS.HELLO_MESSAGE + "\n");
	if (msg) {
		client.write(msg + "\n");
	}
	getPeers(client);
}

// Check if the first message received upon a new connection is the hello message
export function getHello(socket: Net.Socket, peer: string, response: Object) {
	let connectionExists;
	connectionExists = peer in globalThis.connections;

	if (!connectionExists && !Utils.isValidFirstMessage(response)) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: CONSTANTS.HELLO_ERROR,
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
		console.log("Obtaining peers and sending...");
		// Aggregates database of peers into a message to send
		db.PEERS.createReadStream()
			.on("data", function (data) {
				let peerString = data.key;
				if (!peerString.includes(":")) peerString += `:${CONSTANTS.PORT}`;
				peersArray.push(peerString);
			})
			.on("error", function (err) {
				return console.log("Unable to read data stream!", err);
			})
			.on("close", function () {
				const peersMessage = {
					type: "peers",
					peers: peersArray,
				};
				client.write(canonicalize(peersMessage) + "\n");
			});
	})();
}

// Informs peers of your possession of an object
export function gossipObject(obj: Types.Block | Types.Transaction) {
	const hashOfObject = createObjectID(obj);
	(async () => {
		// Iterates through connections sending each the object hash
		for (let peerToInformConnection of globalThis.sockets) {
			peerToInformConnection.write(
				canonicalize({ type: "ihaveobject", objectid: hashOfObject }) + "\n"
			);
		}
	})();
}

// Requests the full object from the appropriate peer upon seeing a hash that you don't have
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

// Upon a peer's getobject request, send the object with the requested hash
export function sendObject(socket: Net.Socket, response: Object) {
	const hash = response["data"]["objectid"];

	(async () => {
		const hashResponse = await db.doesHashExist(hash);

		console.log("Sending object with hash and response:");
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

// Handles well-formatted blocks and adds them to the stored block tree in DB format
async function validateUTXOAndGossipBlock(socket: Net.Socket, block) {
	// Checks block validity
	const blockValidateResponse = await validateBlock(block);
	if (!blockValidateResponse.valid) {
		Utils.sendErrorMessage(socket, blockValidateResponse.msg);
		return;
	}

	const potentialNewTip = {
		block,
		height: blockValidateResponse.data.height,
	} as Types.ChainTip;
	const processBlockUTXO = await handleIncomingValidatedBlock(block);

	// Checks if block is valid with respect to existing UTXO
	if (!processBlockUTXO.valid) {
		Utils.sendErrorMessage(socket, processBlockUTXO.msg);
		return;
	}
	// Gossips the block if it results in a new, valid UTXO
	gossipObject(block);

	console.log("Adding object to DB");
	await db.updateDBWithObjectWithPromise(block);

	if (globalThis.chainTip) {
		if (potentialNewTip.height > globalThis.chainTip.height) {
			// Resets state to UTXO of chain tip
			globalThis.mempoolState = await db.BLOCKUTXOS.get(
				createObjectID(potentialNewTip.block)
			);
			if (
				potentialNewTip.block.previd ===
				createObjectID(globalThis.chainTip.block)
			) {
				// Block is being added to longest chain (no reorg)
				await removeBlockFromMempool(potentialNewTip.block);
				await filterInvalidMempoolTransactions();
			} else {
				// In this case, we perform a chain reorg
				let currentHash = createObjectID(globalThis.chainTip.block);
				const GENESIS_HASH = createObjectID(CONSTANTS.GENESIS_BLOCK);

				// Add blocks back to genesis from old chain tip
				while (currentHash !== GENESIS_HASH) {
					const currentBlock = (await db.BLOCKS.get(
						currentHash
					)) as Types.Block;
					addBlockToMempool(currentBlock);
					currentHash = currentBlock.previd;
				}

				// Remove blocks going back to genesis starting from new chain tip
				currentHash = createObjectID(potentialNewTip.block);
				while (currentHash !== GENESIS_HASH) {
					const currentBlock = (await db.BLOCKS.get(
						currentHash
					)) as Types.Block;
					await removeBlockFromMempool(currentBlock);
					currentHash = currentBlock.previd;
				}
				await filterInvalidMempoolTransactions();
			}
			globalThis.chainTip = potentialNewTip;
		}
	} else {
		globalThis.chainTip = potentialNewTip;
	}
}

// Handles all incoming blocks and transactions (adding to DB, validating, etc.)
export async function addObject(socket: Net.Socket, response: Object) {
	const obj = response["data"]["object"];
	(async () => {
		const objectHash = createObjectID(obj);
		if (objectHash == createObjectID(CONSTANTS.GENESIS_BLOCK)) {
			return;
		}
		const hashResponse = await db.doesHashExist(objectHash);

		const isCoinbase: boolean = obj["height"] != undefined;
		const isBlock: boolean = obj["type"] == "block";

		// Handle incoming coinbase transactions
		if (isCoinbase) {
			if (!hashResponse["exists"]) {
				gossipObject(obj);
				await db.updateDBWithObjectWithPromise(obj);
			}
		} else if (!isBlock) {
			// If object is not a block or coinbase transaction, we check if it's a valid transaction
			const validationResponse = await validateTransaction(obj);
			const isValidTransaction: boolean =
				obj["type"] == "transaction" &&
				(validationResponse["valid"] || isCoinbase);

			// If transaction is valid, check with respect to mempool UTXO and add it there
			if (!hashResponse["exists"] && isValidTransaction) {
				console.log("Received valid transaction");
				const isValidWithMempool = applyTransactionToUTXO(
					obj as Types.Transaction,
					globalThis.mempoolState
				);
				if (isValidWithMempool.valid) {
					console.log("Pushing to mempool");
					globalThis.mempool.push(objectHash);
				}
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

			// Requests transactions in a received block if you don't currently have them
			if (correspondingTransactionsResponse["txids"].size > 0) {
				globalThis.pendingBlocks.set(objectHash, {
					block: obj as Types.Block,
					socket: socket,
					txids: correspondingTransactionsResponse["txids"],
				});
				for (let txid of correspondingTransactionsResponse["txids"]) {
					const getObjectMessage: Types.HashObjectMessage = {
						type: "getobject",
						objectid: txid,
					};
					socket.write(canonicalize(getObjectMessage) + "\n");
				}
				// Time out after 5 seconds if block transactions aren't received
				setTimeout(async () => {
					if (
						globalThis.pendingBlocks.has(objectHash) &&
						globalThis.pendingBlocks.get(objectHash).txids.size != 0
					) {
						globalThis.pendingBlocks.delete(objectHash);
						Utils.sendErrorMessage(
							socket,
							"Did not receive missing transactions in time."
						);
					}
				}, CONSTANTS.TIMEOUT_IN_MILLIS);
			} else {
				// If block is of valid format with all transaction, send it to be considered for the block tree
				validateUTXOAndGossipBlock(socket, obj);
			}
		}
		console.log("Outputting pending blocks:");
		console.log(globalThis.pendingBlocks);
		// Every time transaction is received, check if it completes a pending block
		if (!isBlock) {
			for (let [blockid] of globalThis.pendingBlocks) {
				if (globalThis.pendingBlocks.get(blockid).txids.has(objectHash)) {
					console.log("Filling in missing transaction");
					globalThis.pendingBlocks.get(blockid).txids.delete(objectHash);

					if (globalThis.pendingBlocks.get(blockid).txids.size == 0) {
						validateUTXOAndGossipBlock(
							globalThis.pendingBlocks.get(blockid).socket,
							globalThis.pendingBlocks.get(blockid).block
						).then(() => {
							globalThis.pendingBlocks.delete(blockid);
						});
					}
				}
			}
		}
	})();
}

export function sendChainTip(socket: Net.Socket) {
	console.log("Sending tip");
	if (globalThis.chainTip) {
		const chainTipMessage: Types.ChainTipMessage = {
			type: "chaintip",
			blockid: createObjectID(globalThis.chainTip.block),
		};
		socket.write(canonicalize(chainTipMessage) + "\n");
	}
}

export function addNewChainTip(socket: Net.Socket, response: Object) {
	response["data"]["objectid"] = response["data"]["blockid"];
	console.log("CONSIDERING NEW CHAIN TIP");
	console.log(response);
	retrieveObject(socket, response);
}

export function addMempool(socket: Net.Socket, response: Object) {
	for (const txid of response["data"]["txids"]) {
		response["data"]["objectid"] = txid;
		retrieveObject(socket, response);
	}
}

export function sendMempool(socket: Net.Socket) {
	socket.write(
		canonicalize({ type: "mempool", txids: globalThis.mempool }) + "\n"
	);
}

// Reads off trusted bootstrapping peers from the peers.txt file
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
