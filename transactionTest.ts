import type { Transaction } from "./types";
import * as ed from "@noble/ed25519";
import * as fs from "fs";
import { createObjectID } from "./blockUtils";
import {
	getUnsignedTransactionFrom,
	validateTransaction,
} from "./transactionUtils";
import { doesHashExist } from "./db";
// const validTransaction: Transaction = {
// 	inputs: [
// 		{
// 			outpoint: {
// 				index: 0,
// 				txid: "1bb37b637d07100cd26fc063dfd4c39a7931cc88dae3417871219715a5e374af",
// 			},
// 			sig: "1d0d7d774042607c69a87ac5f1cdf92bf474c25fafcc089fe667602bfefb0494726c519e92266957429ced875256e6915eb8cea2ea66366e739415efc47a6805",
// 		},
// 	],
// 	outputs: [
// 		{
// 			pubkey:
// 				"8dbcd2401c89c04d6e53c81c90aa0b551cc8fc47c0469217c8f5cfbae1e911f9",
// 			value: 10,
// 		},
// 	],
// 	type: "transaction",
// };

async function createTransactionsFrom(sellers: Uint8Array[]): Promise<any[]> {
	let transactions = [];
	// console.log(Buffer.from(publicKey).toString("hex"));
	const coinbase: Transaction = {
		type: "transaction",
		height: 128,
		outputs: [
			{
				pubkey: Buffer.from(await ed.getPublicKey(sellers[1])).toString("hex"),
				value: 50000000000,
			},
		],
	};
	transactions.push(coinbase);
	let outpoint = coinbase;

	for (let i = 1; i < sellers.length - 1; i++) {
		let sig;
		const pubKey = Buffer.from(await ed.getPublicKey(sellers[i+1])).toString(
			"hex"
		);
		// const unsignedTransaction = getUnsignedTransactionFrom(outpoint);
		const newTransaction: Transaction = {
			type: "transaction",
			inputs: [
				{
					outpoint: { txid: createObjectID(outpoint), index: 0 },
					sig: null,
				},
			],
			outputs: [{ pubkey: pubKey, value: 50000000000 }],
		};
		if (outpoint != coinbase) {
			sig = await ed.sign(
				new TextEncoder().encode(JSON.stringify(newTransaction)),
				sellers[i]
			);
		} else {
			sig = await ed.sign(
				new TextEncoder().encode(JSON.stringify(newTransaction)),
				sellers[i]
			);
		}
		newTransaction["inputs"][0]["sig"] = Buffer.from(sig).toString("hex");
		transactions.push(newTransaction);
		outpoint = newTransaction;
	}

	return transactions;
}

const sellers = new Array<Uint8Array>();
for (let i = 0; i < 5; i++) {
	sellers.push(ed.utils.randomPrivateKey());
}
(async () => {
	const transactions = await createTransactionsFrom(sellers);
	var stream = fs.createWriteStream("commands.txt", { flags: "a" });
	for (let transaction of transactions) {
		const objMsg = { object: transaction, type: "object" };
		if (!transaction["height"]) {
			const response = await validateTransaction(transaction);
			console.log(response);
		}
		stream.write(JSON.stringify(objMsg) + "\n");
	}
})();

// (async () => {
// 	console.log(await doesHashExist("blah"));
// })();
