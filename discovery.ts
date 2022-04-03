import * as Net from "net";
import * as Types from "./types";
import * as Utils from "./utils";
import * as fs from "fs";
import { smth } from "./client";
import * as path from "path";
const canonicalize = require("canonicalize");
function sleep(milliseconds) {
	const start = Date.now();
	while (Date.now() - start < milliseconds);
}

declare global {
	var peerStatuses: {};
}

smth();
console.log(globalThis.peerStatuses);

export function connectToNode(client: Net.Socket) {
	// If there is no error, the server has accepted the request and created a new
	// socket dedicated to us.
	console.log("TCP connection established with the server.");

	// The client can now send data to the server by writing to its socket.
	const helloMessage: Types.HelloMessage = {
		type: "hello",
		version: "0.8.0",
		agent: "Adversary Node",
	};
	// FIRST STEP OF TCP HANDSHAKE - CLIENT SEEKS SERVER EXISTENCE

	client.write(canonicalize(helloMessage));
}

export function getDataFromNode(client: Net.Socket, chunk: Buffer) {
	let firstMessageHello = false; // TODO: please change this so that it is stateful
	const response: Types.ValidationMessage = Utils.validateMessage(
		chunk.toString()
	);
	// Check if first message is hello
	if (!firstMessageHello && !Utils.isValidFirstMessage(response)) {
		const errorMessage: Types.ErrorMessage = {
			type: "error",
			error: Utils.HELLO_ERROR,
		};
		client.write(canonicalize(errorMessage));
		client.end();
	} else {
		// Acknowledge that client read server's hello exactly once
		!firstMessageHello &&
			client.write(
				canonicalize({
					type: "acknowledgement",
					message: "Client has received server message",
				})
			);
		firstMessageHello = true;
	}
	// STEP THREE OF TCP HANDSHAKE - CLIENT VERIFIES ITS WRITING FUNCTIONALITY
	console.log(`Data received from the server: ${chunk.toString()}.`);

	// Request an end to the connection after the data has been received.
	client.end();
}

export function obtainBootstrappingPeers(): Set<string> | void {
	fs.readFile(path.join(__dirname, "peers.txt"), "utf8", (error, data) => {
		if (error) {
			console.error(error);
			return;
		}
		return new Set(data.split(/\r?\n/));
	});
	return;
}
