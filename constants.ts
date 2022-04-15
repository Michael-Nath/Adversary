import { HelloMessage } from "types";

export const HELLO_ERROR = "";
export const TYPE_ERROR = "Unsupported message type received\n";
export const FORMAT_ERROR = "Invalid message format\n";
export const WELCOME_ERROR = "Must send hello message first.";
const canonicalize = require("canonicalize");

export const HELLO_MESSAGE: HelloMessage = canonicalize({
	type: "hello",
	version: "0.8.0",
	agent: "Adversary",
});

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