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
export const HELLO_MESSAGE: Types.HelloMessage = {
	type: "Adversary Node",
	version: "0.8.0",
	agent: "test agent",
};
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

	try {
		const parsedMessage: JSON = JSON.parse(message);
		json["data"] = parsedMessage;
		if (!ALLOWABLE_TYPES.has(parsedMessage["type"])) {
			json["error"] = { type: "error", error: TYPE_ERROR };
			return json;
		}
		if (parsedMessage["type"] != "hello" && !globalThis.peers.has(peer)) {
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
}

export async function resetStore() {
	DB.del("peers");
}

export function routeMessage(
	msg: string,
	socket: Socket,
	weInitiated: boolean,
	peer: string
) {
	const response = validateMessage(msg, peer);
	if (response["error"]) {
		sendErrorMessage(socket, response["error"]["error"]);
		return;
	}

	if (response["data"]["type"] == "hello")
		Discovery.getHello(socket, peer, response, weInitiated);
	else if (response["data"]["type"] == "peers")
		Discovery.updatePeers(socket, response);
	else if ((response["data"]["type"] = "getpeers"))
		Discovery.sendPeers(socket, peer, response);
}
export function sanitizeString(socket, peer, str, willComplete) {
	// const str: string = chunk.toString();
	globalThis.peerStatuses[peer]["buffer"] += str;
<<<<<<< HEAD
	// str.charAt(str.length - 1) == "\n"
	if (willComplete) {
		const message = globalThis.peerStatuses[peer]["buffer"]
=======
	if (str.charAt(str.length - 1) == "\n") {
		const message = globalThis.peerStatuses[peer]["buffer"];
>>>>>>> c22755ee993c70704050e1f6d65d63857bd49d51
		globalThis.peerStatuses[peer]["buffer"] = "";
		return message;
	}
	return "";
}
