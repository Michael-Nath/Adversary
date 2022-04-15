/**
 * @author Michael D. Nath, Kenan Hasanaliyev, Gabriel Greenstein
 * @email mnath@stanford.edu, kenanhas@stanford.edu, gbg222@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
import * as Types from "./types";
import level from "level-ts";
import type { Socket } from "net";
import * as Discovery from "./discovery";
import * as ed from "@noble/ed25519";
import { createObjectID } from "./blockUtils";
const canonicalize = require("canonicalize");
const DATABASE_PATH = "./database";

export const HELLO_ERROR = "";
export const TYPE_ERROR = "Unsupported message type received\n";
export const FORMAT_ERROR = "Invalid message format\n";
export const WELCOME_ERROR = "Must send hello message first.";
export const HELLO_MESSAGE: Types.HelloMessage = canonicalize({
	type: "hello",
	version: "0.8.0",
	agent: "Adversary",
});
export const DB = new level(DATABASE_PATH);

export const PORT = 18018;

export const ALLOWABLE_TYPES: Set<string> = new Set([
	"transaction",
	"block",
	"hello",
	"getpeers",
	"peers",
	"ihaveobject",
	"getobject",
	"object",
]);

export var BOOTSTRAPPING_PEERS: Set<string> = new Set([
	"149.28.204.235",
	"149.28.220.241",
	"139.162.130.195",
	"localhost",
]);

export function isValidFirstMessage(response: {}): boolean {
	if (
		response["data"]["type"] == "hello" &&
		response["data"]["version"] == "0.8.0"
	) {
		return true;
	} else {
		return false;
	}
}

export function sendErrorMessage(client: Socket, error: string) {
	const errorMessage: Types.ErrorMessage = {
		type: "error",
		error: error,
	};
	client.write(canonicalize(errorMessage) + "\n");
	client.end();
}

export function doesConnectionExist(socket: Socket) {
	return globalThis.connections.has(socket.id);
}

// Returns JSON that validates the message and adds a corresponding error message if necessary
export function validateMessage(
	socket: Socket,
	message: string
): Types.ValidationMessage {
	const json = {} as Types.ValidationMessage;
	try {
		const parsedMessage: JSON = JSON.parse(message);
		console.log(typeof JSON.parse(message));
		console.log(typeof parsedMessage);
		json["data"] = parsedMessage;
		// console.log("PARSED MESSAGE:")
		// console.log(parsedMessage)
		// console.log(typeof(parsedMessage))
		if (!ALLOWABLE_TYPES.has(parsedMessage["type"])) {
			json["error"] = { type: "error", error: TYPE_ERROR };
			return json;
		}
		if (parsedMessage["type"] != "hello" && !doesConnectionExist(socket)) {
			json["error"] = { type: "error", error: WELCOME_ERROR };
			return json;
		}
	} catch (err) {
		json["error"] = { type: "error", error: FORMAT_ERROR };
		console.error(err);
		return json;
	}
	json["valid"] = true;
	return json;
}

export async function initializeStore() {
	if (!(await DB.exists("peers"))) {
		await DB.put("peers", {});
	}
	if (!(await DB.exists("hashobjects"))) {
		await DB.put("hashobjects", {});
	}
}

export async function resetStore() {
	if (await DB.exists("peers")) {
		await DB.del("peers");
	}
	if (await DB.exists("hashobjects")) {
		await DB.del("hashobjects");
	}
}

export function routeMessage(msg: string, socket: Socket, peer: string) {
	const response = validateMessage(socket, msg);
	console.log("RESPONSE:");
	console.log(response);
	if (response["error"]) {
		sendErrorMessage(socket, response["error"]["error"]);
		return;
	}
	switch (response["data"]["type"]) {
		case "hello":
			Discovery.getHello(socket, peer, response);
			break;
		case "peers":
			Discovery.updatePeers(socket, response);
			break;
		case "getpeers":
			Discovery.sendPeers(socket, response);
			break;
		case "ihaveobject":
			Discovery.retrieveObject(socket, response);
			break;
		case "getobject":
			Discovery.sendObject(socket, response);
			break;
		case "object":
			Discovery.addObject(socket, response, true);
			break;
		case "transaction":
			Discovery.addObject(socket, response, false);
			break;
		default:
			console.error("Invalid message type");
			break;
	}
}
export function sanitizeString(
	socket: Socket,
	str: string,
	willComplete: boolean
) {
	// Add str to the buffer
	globalThis.peerStatuses[socket.id]["buffer"] += str;
	if (willComplete) {
		// Return completed message and clear out buffer
		const message = globalThis.peerStatuses[socket.id]["buffer"];
		globalThis.peerStatuses[socket.id]["buffer"] = "";
		return message;
	}
	return "";
}

export function getUnsignedTransactionFrom(
	transaction: Types.Transaction
): Types.Transaction {
	const unsignedTransaction = transaction;
	unsignedTransaction["inputs"].forEach((input) => {
		input.sig = null;
	});
	return unsignedTransaction;
}

function isHex(h) {
	var a = parseInt(h, 16);
	return a.toString(16) === h.toLowerCase();
}

function transactionIsFormattedCorrectly(transaction: Types.Transaction): {} {
	// FOR PSET 2: Coinbase Transactions are always valid
	if ("height" in transaction) {
		return { valid: true }
	}

	// input and output key must exist in transaction body
	if (!("inputs" in transaction) || !("outputs" in transaction)) {
		return {
			valid: false,
			msg: "Error: output and input key must be present in transaction body.",
		};
	}
	// each input must contain keys "outpoint" and "sig"
	// each input must have a signature that is hexadecimal string
	transaction["inputs"].forEach((input) => {
		if (!("outpoint" in input) || !("sig" in input)) {
			return {
				valid: false,
				msg: "Error: outpoint and sig key must be present in every input.",
			};
		}
		if (!isHex(input.sig)) {
			return {
				valid: false,
				msg: "Error: every signature must be a hexadeciaml decimal.",
			};
		}
	});

	transaction["outputs"].forEach((output) => {
		if (!("pubkey" in output) || !("value" in output)) {
			return {
				valid: false,
				msg: "Error: pubkey and value key must be present in every output.",
			};
		}
		if (
			!isNaN(Number(output["value"])) ||
			output["value"] < 0 ||
			Math.floor(output["value"]) != output["value"]
		) {
			return {
				valid: false,
				msg: "Error: output of a transaction must be non-negative integer.",
			};
		}
		if (!isHex(output["pubkey"])) {
			return {
				valid: false,
				msg: "Error: all public keys must be a hexadecimal string.",
			};
		}
	});
	return { valid: true };
}

export function validateTransaction(transaction: Types.Transaction): {} {
	const formatResponse = transactionIsFormattedCorrectly(transaction);
	if (!formatResponse["valid"]) {
		return formatResponse;
	}
	const unsignedTransaction = getUnsignedTransactionFrom(transaction);
	const inputs: [Types.TransactionInput] = transaction["inputs"];
	const outputs: [Types.TransactionOutput] = transaction["outputs"];
	let inputValues = 0;
	let outputValues = 0;
	for (let i = 0; i < inputs.length; i++) {
		const input = inputs[i];
		const outpoint: Types.Outpoint = input.outpoint;
		const response = outpointExists(outpoint);
		if (!response["exists"]) {
			return { valid: false, msg: "Error: outpoint does not exist." };
		}
		const prevTransactionBody: Types.Transaction = response["obj"];
		if (outpoint.index >= prevTransactionBody.outputs.length) {
			return {
				valid: false,
				msg: "Error: index provided not does not corresponding to any output of outpoint's transaction body.",
			};
		}
		const sigToVerify = Uint8Array.from(Buffer.from(input.sig, "hex"));
		const pubKey = Uint8Array.from(
			Buffer.from(prevTransactionBody.outputs[outpoint.index]["pubkey"], "hex")
		);
		let isValid;
		(async () => {
			isValid = await ed.verify(
				sigToVerify,
				JSON.stringify(unsignedTransaction),
				pubKey
			);
			if (!isValid) {
				return {
					valid: false,
					msg: "Error: invalid signature for transaction body",
				};
			}
		})();
		inputValues += prevTransactionBody.outputs[outpoint.index]["value"];
	}
	outputs.forEach((output) => {
		outputValues += output["value"];
	});
	if (inputValues < outputValues) {
		return {
			valid: false,
			msg: "Error: law of weak conversation is broken in this transaction.",
		};
	}
	return { valid: true };
}

export function outpointExists(outpoint: Types.Outpoint): object {
	let allIDS;
	(async () => {
		allIDS = await DB.get("hashobjects");
	})();
	for (let id in allIDS) {
		if (id == outpoint.txid) {
			return { exists: true, obj: allIDS[id] };
		}
	}
	return { exists: false };
}

export function updateDBWithPeers(peers: Set<string> | Array<string>) {
	let peersObject = {};

	peers.forEach((newPeer) => {
		peersObject[newPeer] = [];
	});
	(async () => {
		await DB.merge("peers", peersObject);
	})();
}

export function updateDBWithObject(obj: Types.Block | Types.Transaction) {
	const hashOfObject = createObjectID(obj);
	console.log("Updating Object with Hash:");
	console.log(hashOfObject);
	(async () => {
		await DB.merge("hashobjects", {[hashOfObject]: obj});
	})();	
}

export async function doesHashExist(hash: string) {
	const allObjects = await DB.get("hashobjects");
	for (let DBhash in allObjects) {
		console.log("DB HASH:");
		console.log(DBhash);
		console.log("REAL HASH");
		console.log(hash);
		if (DBhash == hash) {
			return { exists: true, obj: allObjects[DBhash] };
		}
	}
	return { exists: false };
}
