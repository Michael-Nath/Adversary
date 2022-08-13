import { parentPort } from "worker_threads";
import { Block, TARGET } from "./block";
import { chainManager } from "./chain";
import { logger } from "./logger";
import { mempool } from "./mempool";
import { network } from "./network";
import { ObjectId } from "./object";
const random = require("random-bigint");

function getRandomHex(): string {
	const rn = random(32);
	return bnToHex(rn);
}

function arraysEqual(a: any[], b: any[]) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;
	return a.every((val, idx) => val === b[idx]);
}

function bnToHex(bn: BigInt) {
	var base = 16;
	var hex = bn.toString(base);
	if (hex.length % 2) {
		hex = "0" + hex;
	}
	return hex;
}

export class Miner {
	workingTxIds: ObjectId[] = [];
	workingBlock: Block = this.populateBlockToMine();
	populateBlockToMine(): Block {
		const longestChainTip: Block | null = chainManager.longestChainTip;
		let previd: string | null = "";
		if (longestChainTip == null) {
		//	previd = null;
		previd = "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e";
		} else {
			previd = longestChainTip.blockid;
		}
		const currentUNIXtimestamp = Math.floor(new Date().getTime() / 1000);
		const initial = new Block(
			previd, // previd
			this.workingTxIds, // txids
			getRandomHex(), // nonce
			TARGET, // T
			currentUNIXtimestamp, // created
			"Michael Nath & Kenan Hasanaliyev", // miner
			"This is NOT adversarial." // note
		);
		return initial;
	}

	pullTxsFromMempool() {
		this.workingTxIds = mempool.getTxIds();
	}

	mine() {
		// miner indefinitely mines
		while (true) {
			let previousTxIds = this.workingTxIds;
			this.pullTxsFromMempool();
			if (!arraysEqual(previousTxIds, this.workingTxIds)) {
				logger.info(previousTxIds);
				logger.info(this.workingTxIds);
				this.workingBlock = this.populateBlockToMine();
			}
			if (this.workingBlock.hasPoW()) {
				// broadcast mined block
				// network.broadcast(this.workingBlock.toNetworkObject());
				logger.info("BLOCK HAS BEEN MINED!");
				parentPort?.postMessage(this.workingBlock);
				// break;
			} else {
				// increment nonce by 1
				let nonce_value = BigInt(`0x${this.workingBlock.nonce}`);
				nonce_value += BigInt("1");
				this.workingBlock["nonce"] = bnToHex(nonce_value);
				// logger.info(this.workingBlock["nonce"]);
				// parentPort?.postMessage(this.workingBlock["nonce"]);
			}
		}
		console.log("TESTING LMFAO");
	}
}

// const miner = new Miner();
// miner.mine();

export const miner = new Miner();
