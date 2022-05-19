import { createObjectID } from "./blockUtils";
import { Block, Outpoint, Transaction, VerificationResponse } from "./types";
import * as db from "./db";
import { isCoinbase } from "./transactionUtils";

// Note utxo is passed by reference => no need to return new utxo
export function applyTransactionToUTXO(transaction: Transaction, utxo: Array<Outpoint>): VerificationResponse {
    if (!isCoinbase(transaction)) {
        for(const input of transaction["inputs"]) {
            if(utxo.some(e => e.index == input.outpoint.index && e.txid == input.outpoint.txid)) {
                for (let i = 0; i < utxo.length; i++) {
                    if (utxo[i].index == input.outpoint.index && utxo[i].txid == input.outpoint.txid) {
                        utxo.splice(i, 1);
                    }
                }
            }else {
                return {
                    valid: false,
                    msg: "Input does not correspond to valid UTXO outpoint"
                }
            }
        }
    }
    for (var index = 0; index < transaction["outputs"].length; index++) {
        const txid = createObjectID(transaction);
        // Note key index then key txid is the proper canonicalized order
        const outpointToAdd: Outpoint = {index: index, txid: txid};
        utxo.push(outpointToAdd);
    }
    return {valid: true};
}

export async function applyBlockToUTXO(block: Block, utxo: Array<Outpoint>): Promise<VerificationResponse> {
    const txids: string[] = block["txids"];
	for (let index = 0; index < txids.length; index++) {
		try {
			const transaction = (await db.TRANSACTIONS.get(
				txids[index]
			)) as Transaction;
            const transactionResponse = applyTransactionToUTXO(transaction, utxo);
            if (!transactionResponse["valid"]) {
                return transactionResponse;
            }
		} catch (err) {
			console.log(err);
            return {valid: false, msg: "One or more transactions were not found in the block"};
		}
	}
    console.log("UTXO AFTER BLOCK IS");
    console.log(utxo);
    return {valid: true, data: utxo};
}

export async function filter(arr, callback) {
	const fail = Symbol()
	return (await Promise.all(arr.map(async item => (await callback(item)) ? item : fail))).filter(i=>i!==fail)
}

export async function filterInvalidMempoolTransactions() {
	globalThis.mempool = await filter(globalThis.mempool, async txid => {
		const tx = await db.TRANSACTIONS.get(txid) as Transaction;
		const mempoolStateUpdateResponse = applyTransactionToUTXO(tx, globalThis.mempoolState);
		return mempoolStateUpdateResponse.valid;
	});
}

export async function removeBlockFromMempool(block: Block) {
	globalThis.mempool = await filter(globalThis.mempool, async txid => {
		return (block.txids.indexOf(txid) < 0);
	});
}

export function addBlockToMempool(block: Block) {
	globalThis.mempool = block.txids.concat(globalThis.mempool);
}