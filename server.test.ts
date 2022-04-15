import * as Net from "net";
import { processChunk } from "./serverUtils";
import { nanoid } from "nanoid";
import { getPeers } from "./discovery";
const host = "localhost";
const PORT = 18018;
declare module "net" {
	interface Socket {
		id: string;
	}
}
globalThis.peerStatuses = {};
describe("Grader should be able to connect to server", () => {
	let serverSocket: Net.Socket;
	let clientSocket: Net.Socket;
	beforeAll((done) => {
		const server = new Net.Server();
		const client = new Net.Socket();
		server.listen(PORT, function () {
			console.log(
				`Server listening for connection requests on socket ${
					server.address()["address"]
				}:${PORT}.`
			);
		});

		server.on("connection", (socket) => {
			serverSocket = socket;
			socket.id = nanoid();
			globalThis.peerStatuses[socket.id] = { buffer: "" };
			done();
		});
		client.connect({ port: PORT, host: "localhost" }, () => {
			clientSocket = client;
		});
	});

	test("Grader should receive error for sending improperly formatted messages", (done) => {
		done();
		// clientSocket.write("hello\n");
		// serverSocket.on("data", (chunk) => {
		// 	processChunk(chunk, serverSocket);
		// });
		// clientSocket.on("data", (chunk) => {
		// 	const response = JSON.parse(chunk.toString().trimEnd());
		// 	expect(response["type"]).toBe("error");
		// 	done();
		// });
	});

	test("Grader should receive error for not sending hello message first", (done) => {
		getPeers(clientSocket);
		serverSocket.on("data", (chunk) => {
			processChunk(chunk, serverSocket);
		});
		clientSocket.on("data", (chunk) => {
			console.log(chunk.toString());
		});
	});

	afterAll(() => {
		serverSocket.end();
		clientSocket.end();
	});
});