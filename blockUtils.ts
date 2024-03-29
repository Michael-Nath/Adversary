/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @file blockUtils.ts
 * @desc blockUtils.ts contains all logic pertinent to block validation.
 */
import {
	Transaction,
	Block,
	VerificationResponse,
	TransactionRequest,
	Outpoint,
	HashObjectMessage,
} from "./types";
import {
	isCoinbase,
	isHex,
	validateCoinbase,
	validateTransaction,
} from "./transactionUtils";
import * as sha256 from "fast-sha256";
import * as db from "./db";
import * as CONSTANTS from "./constants";
import { applyBlockToUTXO } from "./utxoUtils";
const T_VALUE =
	"00000002af000000000000000000000000000000000000000000000000000000";
const BLOCK_REWARD = 50000000000000;
const canonicalize = require("canonicalize");

export function createObjectID(object: Block | Transaction): string {
	const canonicalizedJSON = canonicalize(object);
	const uint8arr = new TextEncoder().encode(canonicalizedJSON);
	const hash = sha256.hash(uint8arr);
	return Buffer.from(hash).toString("hex");
}

export function validateBlockFormat(block: Object): VerificationResponse {
	// Block must have desired keys
	const requiredKeys = ["txids", "nonce", "previd", "T", "created", "type"];
	const optionalKeys = ["miner", "note"];
	let missingAnyKeys = false;
	let keysMissing: string[] = [];
	for (let key of requiredKeys) {
		if (block[key] === undefined) {
			missingAnyKeys = true;
			keysMissing.push(key);
		}
	}
	if (missingAnyKeys) {
		return {
			valid: false,
			msg: `Not all required keys in block. Missing: ${keysMissing}`,
		};
	}
	// Blocks must only contain keys either in requiredKeys or optionalKeys
	for (const [key, _] of Object.entries(block)) {
		if (!requiredKeys.includes(key) && !optionalKeys.includes(key)) {
			return { valid: false, msg: `Unknown key: ${key}` };
		}
	}
	const blockifiedBlock = block as Block;
	// Txids must be an array of strings
	if (!Array.isArray(blockifiedBlock["txids"])) {
		return { valid: false, msg: "txids must be an array" };
	}
	for (let txid of blockifiedBlock["txids"]) {
		if (!(typeof txid == "string")) {
			return { valid: false, msg: "txids must be an array of strings" };
		}
	}
	// Nonce must be hex string
	if (!isHex(blockifiedBlock["nonce"])) {
		return { valid: false, msg: "nonce must be hex string" };
	}
	// Previd must be hex string
	if (!isHex(blockifiedBlock["previd"])) {
		return { valid: false, msg: "previd must be hex string" };
	}
	// 'Created' key must be non-negative integer seconds
	if (
		typeof blockifiedBlock["created"] != "number" ||
		blockifiedBlock["created"] < 0 ||
		Math.floor(blockifiedBlock["created"]) != blockifiedBlock["created"]
	) {
		return { valid: false, msg: "created key must be integer timestamp" };
	}

	if (!isHex(blockifiedBlock["T"])) {
		return { valid: false, msg: "target must be hex string" };
	}
	if (
		blockifiedBlock["miner"] != undefined &&
		(typeof blockifiedBlock["miner"] != "string" ||
			blockifiedBlock["miner"].length > 128 ||
			!/^[\x00-\x7F]*$/.test(blockifiedBlock["miner"])) // regex used to test whether string is ascii
	) {
		return {
			valid: false,
			msg: "miner key must be valid string of max length 128",
		};
	}
	if (
		blockifiedBlock["note"] != undefined &&
		(typeof blockifiedBlock["note"] != "string" ||
			blockifiedBlock["note"].length > 128 ||
			!/^[\x00-\x7F]*$/.test(blockifiedBlock["note"]))
	) {
		return {
			valid: false,
			msg: "note key must be valid string of max length 128",
		};
	}
	// Check target
	if (blockifiedBlock["T"] == undefined || blockifiedBlock["T"] != T_VALUE) {
		return {
			valid: false,
			msg: "Invalid target",
		};
	}
	//Check proof of work
	if (!(createObjectID(blockifiedBlock) < blockifiedBlock["T"])) {
		return {
			valid: false,
			msg: "Proof of work invalid",
		};
	}
	return { valid: true };
}

// Node gives peer TIMEOUT_IN_MILLIS amount of time to provide a parent. Otherwise, parent does not exist in the eye of the node
function parentBlockCallback(previd: string): Promise<string> {
	return new Promise((resolve) => {
		globalThis.emitter.on(previd, () => {
			console.log("PARENT FOUND - PROMISED RESOLVED");
			resolve("Parent found");
		});
		setTimeout(() => {
			globalThis.emitter.removeAllListeners(previd);
			resolve("Parent not found");
		}, CONSTANTS.TIMEOUT_IN_MILLIS);
	});
}

export function askForParent(parentid: string) {
	const getObjectMessage: HashObjectMessage = {
		type: "getobject",
		objectid: parentid,
	};
	(async () => {
		for (let peerToInformConnection of globalThis.sockets) {
			peerToInformConnection.write(canonicalize(getObjectMessage) + "\n");
		}
	})();
}

export async function validateBlock(
	block: Object
): Promise<VerificationResponse> {
	let coinbaseTXID;
	let coinbaseOutputValue = 0;
	let sumInputValues = 0;
	let sumOutputValues = 0;
	// Check if parent block exists
	const previd = block["previd"];
	const existenceResponse = await db.doesHashExist(previd);
	if (!existenceResponse.exists) {
		askForParent(previd);
		const parentBlockValidationResponse = await parentBlockCallback(previd);
		if (parentBlockValidationResponse === "Parent found") {
			return validateBlock(block);
		} else {
			return {
				valid: false,
				msg: "Parent block does not exist",
			};
		}
	} else {
		const parent = existenceResponse.obj as Block;
		const parentHeight = await db.HEIGHTS.get(previd);
		const newHeight = parseInt(parentHeight) + 1;

		if (block["created"] <= parent.created) {
			return {
				valid: false,
				msg: "timestamp of created field must be later than that of its parent",
			};
		}
		if (block["created"] > Date.now() / 1000) {
			return {
				valid: false,
				msg: "timestamp of block must be before the current time",
			};
		}
		// Validate each transaction in the block
		const txids: [string] = block["txids"];
		for (let index = 0; index < txids.length; index++) {
			try {
				const transaction = (await db.TRANSACTIONS.get(
					txids[index]
				)) as Transaction;
				if (isCoinbase(transaction)) {
					const coinbaseResponse = validateCoinbase(
						transaction,
						index,
						newHeight
					);
					if (!coinbaseResponse.valid) return coinbaseResponse;
					coinbaseTXID = txids[index];
					coinbaseOutputValue = coinbaseResponse["data"]["value"];
				} else {
					console.log("TRANSACTION ", transaction);
					for (let input of transaction["inputs"]) {
						if (input.outpoint.txid == coinbaseTXID) {
							return {
								valid: false,
								msg: "Coinbase transaction cannot be spent in same block",
							};
						}
					}
					const transactionResponse = await validateTransaction(transaction);
					if (!transactionResponse.valid) return transactionResponse;
					sumInputValues += transactionResponse["data"]["inputValues"];
					sumOutputValues += transactionResponse["data"]["outputValues"];
				}
			} catch (err) {
				console.log(err);
			}
		}
		if (
			coinbaseOutputValue >
			BLOCK_REWARD + (sumInputValues - sumOutputValues)
		) {
			return {
				valid: false,
				msg: "coinbase transaction does not satisfy law of conservation",
			};
		}
		await db.HEIGHTS.put(createObjectID(block as Block), newHeight);
		return { valid: true, data: { height: newHeight } };
	}
}

export async function handleIncomingValidatedBlock(
	block: Block
): Promise<VerificationResponse> {
	var utxoToBeUpdated = (await db.BLOCKUTXOS.get(
		block["previd"]
	)) as Array<Outpoint>;
	const utxoBlockAdditionResponse = await applyBlockToUTXO(
		block,
		utxoToBeUpdated
	);
	if (utxoBlockAdditionResponse["valid"]) {
		await db.BLOCKUTXOS.put(
			createObjectID(block),
			utxoBlockAdditionResponse["data"] as Array<Outpoint>
		);
		return { valid: true };
	} else {
		return utxoBlockAdditionResponse;
	}
}

export async function correspondingTransactionsExist(
	txids: [string]
): Promise<TransactionRequest> {
	let missingTransactions = new Set<string>();
	for (let txid of txids) {
		try {
			await db.TRANSACTIONS.get(txid);
		} catch (err) {
			missingTransactions.add(txid);
		}
	}
	if (missingTransactions.size > 0) {
		return { missing: true, txids: missingTransactions };
	}
	return { missing: false, txids: missingTransactions };
}
