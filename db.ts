import { createObjectID } from "./blockUtils";
import { Block, Outpoint, Transaction } from "types";
import { GENESIS_BLOCK } from "./constants";
import { EventEmitter } from "stream";
const Level = require("level");
const sub = require("subleveldown");

const DATABASE_PATH = "./database";
export const DB = new Level(DATABASE_PATH, { valueEncoding: "json" });
export const TRANSACTIONS = sub(DB, "transactions", { valueEncoding: "json" });
export const PEERS = sub(DB, "peers", { valueEncoding: "json" });
export const BLOCKS = sub(DB, "blocks", { valueEncoding: "json" });
export const BLOCKUTXOS = sub(DB, "blockutxos", { valueEncoding: "json" });
export const HEIGHTS = sub(DB, "heights");

export async function resetStore() {
	await DB.clear();
	const genesisHash = createObjectID(GENESIS_BLOCK);
	await BLOCKS.put(genesisHash, GENESIS_BLOCK);
	await BLOCKUTXOS.put(genesisHash, [] as Array<Outpoint>);
	await HEIGHTS.put(genesisHash, 0);
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
// export function updateDBWithObject(obj: Block | Transaction) {
// 	const hashOfObject = createObjectID(obj);
// 	(async () => {
// 		if (obj.type == "block") {
// 			await BLOCKS.put(hashOfObject, obj);
// 		} else {
// 			await TRANSACTIONS.put(hashOfObject, obj);
// 		}
// 		globalThis.emitter.emit(hashOfObject);
// 	})();
// } 

export async function updateDBWithObjectWithPromise(
	obj: Block | Transaction
): Promise<void> {
	const hashOfObject = createObjectID(obj);
	if (obj.type == "block") {
		await BLOCKS.put(hashOfObject, obj);
	} else {
		await TRANSACTIONS.put(hashOfObject, obj);
	}
	globalThis.emitter.emit(hashOfObject);
}

export async function updateDBWithObjectWithPromiseNoEmit(
	obj: Block | Transaction
): Promise<void> {
	const hashOfObject = createObjectID(obj);
	if (obj.type == "block") {
		await BLOCKS.put(hashOfObject, obj);
	} else {
		await TRANSACTIONS.put(hashOfObject, obj);
	}
}

export async function doesHashExist(hash: string) {
	try {
		const transaction = await TRANSACTIONS.get(hash);
		return { exists: true, obj: transaction };
	} catch (err) {}
	try {
		const block = await BLOCKS.get(hash);
		return { exists: true, obj: block };
	} catch (err) {}
	return { exists: false };
}

export async function printDB() {
	// console.log("PRINTING EVERYTHING IN TRANSACTIONS TABLE");
	// for await (const [key, value] of TRANSACTIONS.iterator()) {
	// 	console.log(key, value);
	// }
	// console.log("PRINTING EVERYTHING IN PEERS TABLE");
	// for await (const [key, value] of PEERS.iterator()) {
	// 	console.log(key, value);
	// }
	// console.log("PRINTING EVERYTHING IN BLOCK TABLE");
	// for await (const [key, value] of BLOCKS.iterator()) {
	// 	console.log(key, value);
	// }
	// console.log("PRINTING EVERYTHING IN BLOCKUTXOS TABLE");
	// for await (const [key, value] of BLOCKUTXOS.iterator()) {
	// 	console.log(key, value);
	// }
	console.log("PRINTING EVERYTHING IN HEIGHTS TABLE");
	for await (const [key, value] of HEIGHTS.iterator()) {
		console.log(key, value);
	}
}
