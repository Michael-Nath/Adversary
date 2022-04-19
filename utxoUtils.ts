import { createObjectID } from "blockUtils";
import { Block, Outpoint, Transaction, VerificationResponse } from "types";
import * as db from "./db";

// Note utxo is passed by reference => no need to return new utxo
export function applyTransactionToUTXO(transaction: Transaction, utxo: Set<Outpoint>): VerificationResponse {
    for(const input of transaction["inputs"]) {
        if(utxo.has(input.outpoint)) {
            utxo.delete(input.outpoint);
        }else {
            return {
                valid: false,
                msg: "Input does not correspond to valid UTXO outpoint"
            }
        }
    }
    for (var index = 0; index < transaction["outputs"].length; index++) {
        const txid = createObjectID(transaction);
        const outpointToAdd: Outpoint = {txid: txid, index: index};
        utxo.add(outpointToAdd);
    }
    return {valid: true};
}

export async function applyBlockToUTXO(block: Block, utxo: Set<Outpoint>): Promise<VerificationResponse> {
    const txids: [string] = block["txids"];
	for (let index = 0; index < txids.length; index++) {
		try {
			const transaction = (await db.TRANSACTIONS.get(
				txids[index]
			)) as Transaction;
            if (!applyTransactionToUTXO(transaction, utxo)["valid"]) {
                return {valid: false, msg: "Error applying transaction in block"};
            }
		} catch (err) {
			console.log(err);
            return {valid: false, msg: "One or more transactions were not found in the block"};
		}
	}
    return {valid: true};
}