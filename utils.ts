export const HELLO_ERROR = "";
export const TYPE_ERROR = "Unsupported message type received\n";
export const FORMAT_ERROR = "Invalid message format\n";

// TODO:
// Make data property of ValidationMessage work with JSON

export interface ValidationMessage {
	valid: boolean;
	error: ErrorMessage;
	data: Object;
}

export interface Message {
	type: string;
}

export interface ErrorMessage extends Message {
	error: string;
}

export const ALLOWABLE_TYPES: Set<string> = new Set([
	"transaction",
	"block",
	"hello",
	"acknowledgement",
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
export function validateMessage(message: string): ValidationMessage {
	const json: ValidationMessage = {
		valid: false,
		error: { type: "error", error: "" },
		data: {},
	};
	try {
		const parsedMessage: JSON = JSON.parse(message);
		json["data"] = parsedMessage;
		if (!ALLOWABLE_TYPES.has(message["type"])) {
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
