import { Transaction, Block, VerificationResponse } from "./types";
import * as sha256 from "fast-sha256";
import { isHex } from "transactionUtils";

const canonicalize = require("canonicalize");
export function createObjectID(object: Block | Transaction): string {
	const canonicalizedJSON = canonicalize(object);
	const uint8arr = new TextEncoder().encode(canonicalizedJSON);
	const hash = sha256.hash(uint8arr);
	return Buffer.from(hash).toString("hex");
}

export function validateBlockFormat(block: Object): VerificationResponse {
	// block must have desired keys
	const requiredKeys = ["txids", "nonce", "previd"];
	const optionalKeys = ["miner", "note"];
	for (let key of requiredKeys) {
		if (!block[key]) {
			return { valid: false, msg: `not all required keys in block` };
		}
	}

	for (const [key, value] of Object.entries(block)) {
		if (!requiredKeys.includes(key) && !optionalKeys.includes(key)) {
			return { valid: false, msg: `Unknown key ${key}` };
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
	// 'created' key must be integer seconds
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
}

const fakeBlock = {
	nonce: "Monkey",
	txids: [1, 2],
};

console.log(validateBlockFormat(fakeBlock));
