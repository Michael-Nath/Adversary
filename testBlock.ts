import { validateBlock, validateBlockFormat } from "./blockUtils";
import type { Block, Transaction } from "./types";

// const createBlockFrom(transactions: [string]) : Block {
//     return {
//         type: "block",
//         txids: transactions,
//         nonce: "",

//     }
// }

const GENESIS = {
	nonce: "c5ee71be4ca85b160d352923a84f86f44b7fc4fe60002214bc1236ceedc5c615",
	T: "00000002af000000000000000000000000000000000000000000000000000000",
	created: 1649827795114,
	miner: "svatsan",
	note: "First block. Yayy, I have 50 bu now!!",
	previd: "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e",
	txids: ["1bb37b637d07100cd26fc063dfd4c39a7931cc88dae3417871219715a5e374af"],
	type: "block",
};

const TX = {
	type: "transaction",
	height: 0,
	outputs: [
		{
			pubkey:
				"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9",
			value: 50000000000,
		},
	],
};

const response = validateBlockFormat(GENESIS);
const txObj = { object: TX, type: "object" };
const blockObj = { object: GENESIS, type: "object" };
console.log(JSON.stringify(txObj));
console.log(JSON.stringify(blockObj));
