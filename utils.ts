/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
import * as Types from "./types";
import type { Socket } from "net";
import * as Discovery from "./discovery";
import * as Constants from "./constants"
import { KeyObject } from "crypto";
const canonicalize = require("canonicalize");

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
		if (!Constants.ALLOWABLE_TYPES.has(parsedMessage["type"])) {
			json["error"] = { type: "error", error: Constants.TYPE_ERROR };
			return json;
		}
		if (parsedMessage["type"] != "hello" && !doesConnectionExist(socket)) {
			json["error"] = { type: "error", error: Constants.WELCOME_ERROR };
			return json;
		}
	} catch (err) {
		json["error"] = { type: "error", error: Constants.FORMAT_ERROR };
		console.error(err);
		return json;
	}
	json["valid"] = true;
	return json;
}


export function routeMessage(msg: string, socket: Socket, peer: string) {
	const response = validateMessage(socket, msg);

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

