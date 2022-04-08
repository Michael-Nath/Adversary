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
const canonicalize = require("canonicalize");
const DATABASE_PATH = "./database";

export const HELLO_ERROR = "";
export const TYPE_ERROR = "Unsupported message type received\n";
export const FORMAT_ERROR = "Invalid message format\n";
export const WELCOME_ERROR = "Must send hello message first.";
export const DB = new level(DATABASE_PATH);

// TODO:
// Make data property of ValidationMessage work with JSON
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
	client.write(canonicalize(errorMessage));
	client.end();
}

// Returns JSON that validates the message and adds a corresponding error message if necessary
export function validateMessage(
	message: string,
	peer: string
): Types.ValidationMessage {
	const json = {} as Types.ValidationMessage;
	console.log(message);
	try {
		const parsedMessage: JSON = JSON.parse(message);
		json["data"] = parsedMessage;
		if (!ALLOWABLE_TYPES.has(parsedMessage["type"])) {
			json["error"] = { type: "error", error: TYPE_ERROR };
			return json;
		}
		if (parsedMessage["type"] != "hello" && !(peer in globalThis.peers)) {
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
	if (!(await DB.exists("clientPeers"))) {
		DB.put("clientPeers", {});
	}
	if (!(await DB.exists("serverPeers"))) {
		DB.put("serverPeers", {});
	}
	console.log(await DB.get("clientPeers"));
	console.log(await DB.get("serverPeers"));
}

export async function resetStore() {
	DB.del("clientPeers");
	DB.del("serverPeers");
}

export function routeMessage(
	msg: string,
	socket: Socket,
	weInitiated: boolean,
	peer: string
) {
	const response = validateMessage(msg, peer);
	console.log(response);
	if (response["error"]) {
		sendErrorMessage(socket, response["error"]["error"]);
		return;
	}
	switch (response["data"]["type"]) {
		case "hello":
			Discovery.getHello(socket, peer, response, weInitiated);
		case "getpeers":
			Discovery.sendPeers(socket, peer, response);
		case "peers":
			Discovery.updatePeers(socket, response);
	}
}
export function sanitizeString(socket, peer, str, willComplete) {
	// const str: string = chunk.toString();
	globalThis.peerStatuses[peer]["buffer"] += str;
	// str.charAt(str.length - 1) == "\n"
	if (willComplete) {
		const message = globalThis.peerStatuses[peer]["buffer"]
		globalThis.peerStatuses[peer]["buffer"] = "";
		return message;
	}
	return ""
}
