import { startServer } from "./server";
import * as Net from "net";
import * as Utils from "./utils";
import * as Types from "./types";
jest.setTimeout(10000)
const port = 18018;
const host = "localhost";

const myPromise = new Promise((resolve, reject) => {
	const grader = new Net.Socket();
	grader.connect({ port, host },  () => {
		const msg = JSON.stringify(Utils.HELLO_MESSAGE)
		console.log(msg)
		grader.write(msg);
	});
	grader.on("data", (chunk) => {
		const msg = chunk.toString()
		resolve(msg);
	})
});


test("Grader should receive a valid hello message on connecting", async () => {
	return myPromise.then((res) => expect(res).toBe("smth"));
});
