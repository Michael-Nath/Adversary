// Include Nodejs' net module.
const Net = require("net");
import * as Utils from "./utils";
import * as Types from "./types";
import * as Discovery from "./discovery";
const canonicalize = require("canonicalize");
// The port number and hostname of the server.
const host = "localhost";
let firstMessageHello = false;
// Create a new TCP client.
const client = new Net.Socket();
// Send a connection request to the server.
export function smth() {
	globalThis.peerStatuses = { hello: true };
}

// client.connect({ port: Utils.PORT }, () => Discovery.connectToNode(client));

// // The client can also receive data from the server by reading from its socket.
// client.on("data", (chunk) => Discovery.getDataFromNode(client, chunk));

// client.on("end", function () {
// 	console.log("Requested an end to the TCP connection");
// });
