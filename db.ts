import { createObjectID } from "./blockUtils";
import { Block, Transaction } from "types";
const Level = require("level");
const sub = require("subleveldown");

const DATABASE_PATH = "./database";
export const DB = new Level(DATABASE_PATH);
export const TRANSACTIONS = sub(DB, "transactions");
export const PEERS = sub(DB, "peers");
export const BLOCKUTXOS = sub(DB, "blockutxos");

export async function resetStore() {
	await DB.clear();
}

export function updateDBWithPeers(peers: Set<string> | Array<string>) {
	let peersObject = {};

	peers.forEach((newPeer) => {
		peersObject[newPeer] = [];
	});
	(async () => {
		await DB.merge("peers", peersObject);
	})();
}
export function updateDBWithObject(obj: Block | Transaction) {
	const hashOfObject = createObjectID(obj);

	(async () => {
		await DB.merge("hashobjects", { [hashOfObject]: obj });
	})();
}

export async function doesHashExist(hash: string) {
	const allObjects = await DB.get("hashobjects");
	for (let DBhash in allObjects) {
		if (DBhash == hash) {
			return { exists: true, data: allObjects[DBhash] };
		}
	}
	return { exists: false };
}
