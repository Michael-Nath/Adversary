import * as Types from "./types";
export const HELLO_ERROR = "";
export const TYPE_ERROR = "Unsupported message type received\n";
export const FORMAT_ERROR = "Invalid message format\n";

// TODO:
// Make data property of ValidationMessage work with JSON
export const PORT = 18018;

export const ALLOWABLE_TYPES: Set<string> = new Set([
	"transaction",
	"block",
	"hello",
	"acknowledgement",
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

// Returns JSON that validates the message and adds a corresponding error message if necessary
export function validateMessage(message: string): Types.ValidationMessage {
	const json = {} as Types.ValidationMessage;
	try {
		const parsedMessage: JSON = JSON.parse(message);
		json["data"] = parsedMessage;
		if (!ALLOWABLE_TYPES.has(parsedMessage["type"])) {
			json["error"] = { type: "error", error: TYPE_ERROR };
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
