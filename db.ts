import { createObjectID } from "./blockUtils";
import { Block, Transaction } from "types";
import { GENESIS_BLOCK } from "./constants";
const Level = require("level");
const sub = require("subleveldown");

const DATABASE_PATH = "./database";
export const DB = new Level(DATABASE_PATH, { valueEncoding: "json" });
export const TRANSACTIONS = sub(DB, "transactions", { valueEncoding: "json" });
export const PEERS = sub(DB, "peers", { valueEncoding: "json" });
export const BLOCKS = sub(DB, "blocks", { valueEncoding: "json" });

export async function resetStore() {
	await DB.clear();
	const genesisHash = createObjectID(GENESIS_BLOCK);
	await BLOCKS.put(genesisHash, GENESIS_BLOCK);
}

export function updateDBWithPeers(peers: Set<string> | Array<string>) {
	let ops = [];
	peers.forEach((newPeer) => {
		ops.push({ type: "put", key: newPeer, value: [] });
	});
	(async () => {
		await PEERS.batch(ops, (err) => {
			if (err) console.log("Error when adding peers: ", err);
		});
	})();
}
export function updateDBWithObject(obj: Block | Transaction) {
	const hashOfObject = createObjectID(obj);
	(async () => {
		if (obj.type == "block") {
			await BLOCKS.put(hashOfObject, obj);
		} else {
			await TRANSACTIONS.put(hashOfObject, obj);
		}
	})();
}

export async function doesHashExist(hash: string) {
	try {
		if ((await TRANSACTIONS.get(hash)) || (await BLOCKS.get(hash)))
			return { exists: true };
	} catch (err) {
		return { exists: false };
	}
}
export async function printDB() {
	console.log("PRINTING EVERYTHING IN TRANSACTIONS TABLE");
	for await (const [key, value] of TRANSACTIONS.iterator()) {
		console.log(key, value);
	}
	console.log("PRINTING EVERYTHING IN PEERS TABLE");
	for await (const [key, value] of PEERS.iterator()) {
		console.log(key, value);
	}
	console.log("PRINTING EVERYTHING IN BLOCK TABLE");
	for await (const [key, value] of BLOCKS.iterator()) {
		console.log(key, value);
	}
}
