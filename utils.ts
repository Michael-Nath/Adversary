/**
 * @author Michael D. Nath, Kenan Hasanaliyev, Gabriel Greenstein
 * @email mnath@stanford.edu, kenanhas@stanford.edu, gbg222@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
import * as Types from "./types";
import level from "level-ts";
import { Socket } from "net";
import * as Discovery from "./discovery";
import { parse } from "path";
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
	return globalThis.connections.has(socket.id)
}

// Returns JSON that validates the message and adds a corresponding error message if necessary
export function validateMessage(
	socket: Socket,
	message: string,
): Types.ValidationMessage {
	const json = {} as Types.ValidationMessage;
	try {
		
		const parsedMessage: JSON = JSON.parse(message);
		console.log(typeof JSON.parse(message))
		console.log(typeof parsedMessage)
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
		DB.put("peers", {});
	}
	if (!(await DB.exists("objects"))) {
		DB.put("objects", {});
	}
}


export async function resetStore() {
	if (await DB.exists("peers")) {
		DB.del("peers");
	}
	if (await DB.exists("objects")) {
		DB.del("objects");
	}
}

export function routeMessage(msg: string, socket: Socket, peer: string) {
	const response = validateMessage(socket, msg);
	console.log("RESPONSE:")
	console.log(response)
	if (response["error"]) {
		sendErrorMessage(socket, response["error"]["error"]);
		return;
	}
	if (response["data"]["type"] == "hello")
		Discovery.getHello(socket, peer, response);
	else if (response["data"]["type"] == "peers")
		Discovery.updatePeers(socket, response);
	else if ((response["data"]["type"] = "getpeers"))
		Discovery.sendPeers(socket, peer, response);
}
export function sanitizeString(socket: Socket, str: string, willComplete: boolean) {
	// Add str to the buffer
	globalThis.peerStatuses[socket.id]["buffer"] += str;
	if (willComplete) {
		// Return completed message and clear out buffer
		const message = globalThis.peerStatuses[socket.id]["buffer"]
		globalThis.peerStatuses[socket.id]["buffer"] = "";
		return message;
	}
	return "";
}

export function updateDBWithPeers(peers: Set<string> | Array<string>) {
	let peersObject = {}
	
	peers.forEach((newPeer) => {
		peersObject[newPeer] = [];
	});
	(async () => {
		await DB.merge("peers", peersObject);
	})();
}
