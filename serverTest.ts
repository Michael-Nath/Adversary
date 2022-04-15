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
	// grader.write(canonicalize(helloMessage)+'\n' + "{\"type\":\"ge" + "tpeers\"}\n{\"type\":\"getpeers\"}\n");
	grader.write("{\"type\":\"ge")
	// setTimeout(() => {grader.write("tpeers\"}\n{\"agent\":\"Grader Node\",\"type\":\"hello\",\"version\":\"0.8.0\"}\n")}, 3000);
	
	setTimeout(() => {grader.write("tpeers\"}\n{\"type\":\"getpeers\"}\n")}, 3000);

});
grader.on("data", (chunk) => {
	
    // grader.write(canonicalize(peersMessage))
	// const response = Utils.validateMessage(chunk.toString(), grader.address()["address"]);
});
