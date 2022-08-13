/**
 * @author Michael D. Nath, Kenan Hasanaliyev
 * @email mnath@stanford.edu, kenanhas@stanford.edu
 * @file transactionUtils.ts
 * @desc transactionUtils.ts contains logic for validating transactions (correct format, signature, law of conservation, etc)
 */
import {
	Transaction,
	VerificationResponse,
	TransactionInput,
	TransactionOutput,
	Outpoint,
} from "types";
import { TRANSACTIONS } from "./db";
import * as ed from "@noble/ed25519";

export async function outpointExists(
	outpoint: Outpoint
): Promise<VerificationResponse> {
	try {
		const transaction = await TRANSACTIONS.get(outpoint.txid);
		console.log(`OUTPOINT: ${transaction}`);
		return { exists: true, obj: transaction };
	} catch {
		return { exists: false };
	}
}

export function isCoinbase(transaction: Transaction): boolean {
	return (
		transaction["height"] != undefined && transaction["inputs"] == undefined
	);
}
export function validateCoinbase(
	coinbase: Transaction,
	index: number,
	correctHeight: number
): VerificationResponse {
	if (index != 0)
		return {
			valid: false,
			msg: "Coinbase transaction not first transaction in block",
		};
	if (coinbase["outputs"].length != 1) {
		return {
			valid: false,
			msg: "Coinbase transaction must have exactly one output",
		};
	}
	if (
		typeof coinbase["height"] != "number" ||
		coinbase["height"] < 0 ||
		Math.floor(coinbase["height"]) != coinbase["height"]
	) {
		return {
			valid: false,
			msg: "Coinbase transaction must have valid non-negative integer height",
		};
	}
	if (coinbase["height"] != correctHeight) {
		return {
			valid: false,
			msg: "Coinbase transaction height must match block height from genesis",
		};
	}
	return { valid: true, data: { value: coinbase["outputs"][0]["value"] } };
}

export function getUnsignedTransactionFrom(
	transaction: Transaction
): Transaction {
	console.log(`TRYING TO UNSIGN TRANSACTION: ${transaction}`);
	const unsignedTransaction = JSON.parse(
		JSON.stringify(transaction)
	) as Transaction;
	// Only replace signatures with null if transaction has inputs
	unsignedTransaction["inputs"] &&
		unsignedTransaction["inputs"].forEach((input) => {
			input.sig = null;
		});
	return unsignedTransaction;
}

export function isHex(h): boolean {
	try {
		return ((h as string).match(/^[0-9a-f]+$/) != null) ? true : false;
	} catch (err) {
		console.log(err);
		return false;
	}
}

function transactionIsFormattedCorrectly(
	transaction: Transaction
): VerificationResponse {
	if (isCoinbase(transaction)) {
		return { valid: true };
	}
	// input and output key must exist in transaction body
	if (!("inputs" in transaction) || !("outputs" in transaction)) {
		return {
			valid: false,
			msg: "Error: output and input key must be present in transaction body.",
		};
	}
	// each input must contain keys "outpoint" and "sig"
	// each input must have a signature that is hexadecimal string
	for (let input of transaction["inputs"]) {
		console.log(`INPUT: ${input}`);
		if (!input.outpoint) {
			return {
				valid: false,
				msg: "Error: outpoint must be present in every input.",
			};
		}
		if (!input.sig) {
			return {
				valid: false,
				msg: "Error: sig key must be present in every input.",
			};
		} else if (input["sig"] == null) {
			return {
				valid: false,
				msg: "Error: sig key must not be null.",
			};
		}
		if (!isHex(input.sig)) {
			return {
				valid: false,
				msg: "Error: every signature must be a hexadeciaml decimal.",
			};
		}
	}

	for (let output of transaction["outputs"]) {
		if (output.pubkey == undefined || output.value == undefined) {
			return {
				valid: false,
				msg: "Error: pubkey and value key must be present in every output.",
			};
		}
		if (!Number.isInteger(output["value"]) || output["value"] < 0) {
			return {
				valid: false,
				msg: "Error: output of a transaction must be non-negative integer.",
			};
		}
		if (!isHex(output["pubkey"])) {
			return {
				valid: false,
				msg: "Error: all public keys must be a hexadecimal string.",
			};
		}
	}
	return { valid: true };
}

export async function validateTransaction(
	transaction: Transaction
): Promise<VerificationResponse> {
	const formatResponse = transactionIsFormattedCorrectly(transaction);
	if (!formatResponse["valid"]) {
		return formatResponse;
	}
	const unsignedTransaction = getUnsignedTransactionFrom(transaction);
	const inputs: [TransactionInput] = transaction["inputs"];
	const outputs: [TransactionOutput] = transaction["outputs"];
	let inputValues = 0;
	let outputValues = 0;
	let outpointMap = new Map<string, boolean>();
	for (let i = 0; i < inputs.length; i++) {
		const input = inputs[i];
		const outpoint: Outpoint = input.outpoint;
		const response = await outpointExists(outpoint);
		if (!response["exists"]) {
			return { valid: false, msg: "Error: outpoint does not exist." };
		}

		const prevTransactionBody: Transaction = response["obj"];
		console.log("PREV TRANSACTION BODY: ", JSON.stringify(prevTransactionBody));
		if (outpoint.index >= prevTransactionBody.outputs.length) {
			return {
				valid: false,
				msg: "Error: index provided not does not corresponding to any output of outpoint's transaction body.",
			};
		}
		const outpointString = JSON.stringify(outpoint);
		if (outpointMap.get(outpointString) != undefined) {
			return {
				valid: false,
				msg: "Error: multiple inputs cannot spend from same outpoint.",
			};
		} else {
			outpointMap.set(outpointString, true);
		}
		try {
			const sigToVerify = Uint8Array.from(Buffer.from(input.sig, "hex"));
			const pubKey = Uint8Array.from(
				Buffer.from(
					prevTransactionBody.outputs[outpoint.index]["pubkey"],
					"hex"
				)
			);
			const isValid = await ed.verify(
				sigToVerify,
				new TextEncoder().encode(JSON.stringify(unsignedTransaction)),
				pubKey
			);
			if (!isValid) {
				return {
					valid: false,
					msg: "Error: invalid signature for transaction body",
				};
			}
		} catch (err) {
			console.log(err);
			return {
				valid: false,
				msg: "Error: invalid signature for transaction body",
			};
		}
		inputValues += prevTransactionBody.outputs[outpoint.index]["value"];
	}
	outputs.forEach((output) => {
		outputValues += output["value"];
	});
	if (inputValues < outputValues) {
		return {
			valid: false,
			msg: "Error: law of weak conversation is broken in this transaction.",
		};
	}
	return { valid: true, data: { inputValues, outputValues } };
}
