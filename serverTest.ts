import { startServer } from "./server";
import * as Net from "net";
import * as Utils from "./utils";
import * as Types from "./types";
const canonicalize = require("canonicalize");
const port = 18018;
const host = "localhost";
const grader = new Net.Socket();
// startServer();
const helloMessage: Types.HelloMessage = {
	type: "hello",
	version: "0.8.0",
	agent: "Grader Node",
};

const peersMessage = {
    type: "peers",
    peers: ["dionyziz.com:18018"]
}
// const helloMessage = { type: "hello" };
grader.connect({ port, host }, () => {
	grader.write(canonicalize(helloMessage)+'\n');
});
grader.on("data", (chunk) => {
	console.log(`received from server: ${chunk.toString()}`);
    grader.write(canonicalize(peersMessage))
	// const response = Utils.validateMessage(chunk.toString(), grader.address()["address"]);
});
