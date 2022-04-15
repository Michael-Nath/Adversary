import { createObjectID } from "blockUtils";
import { Block, Transaction } from "types"
import level from "level-ts"

const DATABASE_PATH = "./database";

export const DB = new level(DATABASE_PATH);


export async function initializeStore() {
	if (!(await DB.exists("peers"))) {
		await DB.put("peers", {});
	}
	if (!(await DB.exists("hashobjects"))) {
		await DB.put("hashobjects", {});
	}
}


export async function resetStore() {
	if (await DB.exists("peers")) {
		await DB.del("peers");
	}
	if (await DB.exists("hashobjects")) {
		await DB.del("hashobjects");
	}
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
			return { exists: true, obj: allObjects[DBhash] };
		}
	}
	return { exists: false };
}