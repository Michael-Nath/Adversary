import {
	Transaction,
	Block,
	VerificationResponse,
	TransactionRequest,
} from "./types";
import * as sha256 from "fast-sha256";
import {
	isCoinbase,
	isHex,
	validateCoinbase,
	validateTransaction,
} from "./transactionUtils";
import * as db from "./db";
const T_VALUE =
	"00000002af000000000000000000000000000000000000000000000000000000";
const BLOCK_REWARD = 50000000000;
const canonicalize = require("canonicalize");

export function createObjectID(object: Block | Transaction): string {
	const canonicalizedJSON = canonicalize(object);
	const uint8arr = new TextEncoder().encode(canonicalizedJSON);
	const hash = sha256.hash(uint8arr);
	return Buffer.from(hash).toString("hex");
}

export function validateBlockFormat(block: Object): VerificationResponse {
	// block must have desired keys
	const requiredKeys = ["txids", "nonce", "previd", "T", "created", "type"];
	const optionalKeys = ["miner", "note"];
	for (let key of requiredKeys) {
		if (!block[key]) {
			return { valid: false, msg: `not all required keys in block` };
		}
	}

	for (const [key, value] of Object.entries(block)) {
		if (!requiredKeys.includes(key) && !optionalKeys.includes(key)) {
			return { valid: false, msg: `Unknown key: ${key}` };
		}
	}
	const blockifiedBlock = block as Block;
	// txids must be an array of strings
	if (!Array.isArray(blockifiedBlock["txids"])) {
		return { valid: false, msg: "txids must be an array" };
	}
	for (let txid of blockifiedBlock["txids"]) {
		if (!(typeof txid == "string")) {
			return { valid: false, msg: "txids must be an array of strings" };
		}
	}
	// nonce must be hex string
	if (!isHex(blockifiedBlock["nonce"])) {
		return { valid: false, msg: "nonce must be hex string" };
	}
	// previd must be hex string
	if (!isHex(blockifiedBlock["previd"])) {
		return { valid: false, msg: "previd must be hex string" };
	}
	// 'created' key must be non-negative integer seconds
	if (
		typeof blockifiedBlock["created"] != "number" ||
		blockifiedBlock["created"] <= 0 ||
		Math.floor(blockifiedBlock["created"]) != blockifiedBlock["created"]
	) {
		return { valid: false, msg: "created key must be integer timestamp" };
	}

	if (!isHex(blockifiedBlock["T"])) {
		return { valid: false, msg: "target must be hex string" };
	}
	if (
		blockifiedBlock["miner"] &&
		(typeof blockifiedBlock["miner"] != "string" ||
			blockifiedBlock["miner"].length > 128)
	) {
		return {
			valid: false,
			msg: "miner key must be valid string of max length 128",
		};
	}
	if (
		blockifiedBlock["note"] &&
		(typeof blockifiedBlock["note"] != "string" ||
			blockifiedBlock["note"].length > 128)
	) {
		return {
			valid: false,
			msg: "note key must be valid string of max length 128",
		};
	}
	// Check target
	if (!blockifiedBlock["T"] || blockifiedBlock["T"] != T_VALUE) {
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

export async function validateBlock(
	block: Object
): Promise<VerificationResponse> {
	const response = validateBlockFormat(block);
	if (!response.valid) return response;
	let coinbaseTXID;
	let coinbaseOutputValue = 0;
	let sumInputValues = 0;
	let sumOutputValues = 0;
	// validate each transaction in the block
	const txids: [string] = block["txids"];
	for (let index = 0; index < txids.length; index++) {
		try {
			const transaction = (await db.TRANSACTIONS.get(
				txids[index]
			)) as Transaction;

			if (isCoinbase(transaction)) {
				const coinbaseResponse = validateCoinbase(transaction, index);
				if (!coinbaseResponse.valid) return coinbaseResponse;
				coinbaseTXID = txids[index];
				coinbaseOutputValue = coinbaseResponse["data"]["value"];
			} else {
				console.log("TRANSACTION ", transaction);
				for (let input of transaction["inputs"]) {
					if (input.outpoint == coinbaseTXID) {
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
	if (coinbaseOutputValue > BLOCK_REWARD + (sumOutputValues - sumInputValues))
		return {
			valid: false,
			msg: "coinbase transaction does not satisfy law of conservation",
		};
	return { valid: true };
}

// TODO: create function that takes a TransactionRequest object and sends a getpeers message asking for the missing transactions.
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

const fakeBlock = {
	nonce: "Monkey",
	txids: ["MOnkeyyys", 2],
};

const genesis = {
	nonce: "c5ee71be4ca85b160d352923a84f86f44b7fc4fe60002214bc1236ceedc5c615",
	T: "00000002af000000000000000000000000000000000000000000000000000000",
	created: 1649827795114,
	miner: "svatsan",
	note: "First block. Yayy, I have 50 bu now!!",
	previd: "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e",
	txids: ["1bb37b637d07100cd26fc063dfd4c39a7931cc88dae3417871219715a5e374af"],
	type: "block",
};
