import { startServer } from "./server";
import * as Net from "net";
import * as Utils from "./utils";
import * as Types from "./types";
const canonicalize = require("canonicalize");
const port = 18018;
const host = "localhost";
startServer();

// test("Grader should receive a valid hello message on connecting", () => {
// 	const grader = new Net.Socket();
// 	const helloMessage: Types.HelloMessage = {
// 		type: "hello",
// 		version: "0.8.0",
// 		agent: "Adversary Node",
// 	};
// 	grader.connect({ port, host }, () => {
// 		grader.write(canonicalize(helloMessage));
// 	});
// 	grader.on("data", (chunk) => {
// 		const response = Utils.validateMessage(chunk.toString());
// 		expect(response["data"]["type"]).toBe("hello");
// 	});
// });


