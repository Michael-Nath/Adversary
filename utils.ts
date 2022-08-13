/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @file utils.ts
 * @desc utils.ts contains helper functions for message and connection handling
 */

import * as Types from "./types";
import type { Socket } from "net";
import * as Discovery from "./discovery";
import * as CONSTANTS from "./constants";
import { EventEmitter } from "stream";
import * as db from "./db";
import { GENESIS_BLOCK } from "./constants";
import {PendingBlock, Outpoint } from "./types";

const canonicalize = require("canonicalize");

//  A peer interested in connecting with us MUST send a hello message as defined by the Marabu protocol
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
		json["data"] = parsedMessage;
		if (!CONSTANTS.ALLOWABLE_TYPES.has(parsedMessage["type"])) {
			json["error"] = { type: "error", error: CONSTANTS.TYPE_ERROR };
			return json;
		}
		if (parsedMessage["type"] != "hello" && !doesConnectionExist(socket)) {
			json["error"] = { type: "error", error: CONSTANTS.WELCOME_ERROR };
			return json;
		}
	} catch (err) {
		json["error"] = { type: "error", error: CONSTANTS.FORMAT_ERROR };
		console.error(err);
		return json;
	}
	json["valid"] = true;
	return json;
}

export function initializeGlobals() {
	globalThis.connections = Discovery.obtainBootstrappingPeers() as Set<string>;
	db.updateDBWithPeers(globalThis.connections);
	globalThis.peerStatuses = {};
	globalThis.sockets = new Set<Socket>();
	globalThis.pendingBlocks = new Map<string, PendingBlock>();
	globalThis.emitter = new EventEmitter();
	globalThis.chainTip = { block: GENESIS_BLOCK, height: 0 };
	globalThis.mempool = new Array<string>();
	globalThis.mempoolState = new Array<Outpoint>();
}

export function routeMessage(msg: string, socket: Socket, peer: string) {
	const response = validateMessage(socket, msg);

	if (response["error"]) {
		console.log("INVALID MESSAGE RECEIVED - SENDING THIS OUT");
		console.log(msg);
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
		case "getchaintip":
			Discovery.sendChainTip(socket);
			break;
		case "chaintip":
			Discovery.addNewChainTip(socket, response);
			break;
		case "object":
			(async () => {
				Discovery.addObject(socket, response);
			})();
			break;
		case "mempool":
			Discovery.addMempool(socket, response);
			break;
		case "getmempool":
			Discovery.sendMempool(socket);
			break;
		default:
			console.error("Invalid message type");
			break;
	}
}

// Sometimes peers send the node incomplete messages (separate chunks sent over a time interval), 
// so sanitizeString maintains a buffer until all chunks have been received.
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
