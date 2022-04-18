import {
	Transaction,
	VerificationResponse,
	TransactionInput,
	TransactionOutput,
	Outpoint,
	HashToObjectMap,
} from "types";
import { DB } from "./db";
import * as ed from "@noble/ed25519";

export async function outpointExists(
	outpoint: Outpoint
): Promise<VerificationResponse> {
	const allIDS: HashToObjectMap = await DB.get("hashobjects");
	for (let id in allIDS) {
		if (id == outpoint.txid) {
			return { exists: true, obj: allIDS[id] };
		}
	}
	return { exists: false };
}

export function getUnsignedTransactionFrom(
	transaction: Transaction
): Transaction {
	console.log("TRYING TO UNSIGN TRANSACTION:");
	console.log(transaction);
	const unsignedTransaction = JSON.parse(
		JSON.stringify(transaction)
	) as Transaction;
	unsignedTransaction["inputs"].forEach((input) => {
		input.sig = null;
	});
	return unsignedTransaction;
}

function isHex(h: string): boolean {
	var a = parseInt(h, 16);
	return a.toString(16) === h.toLowerCase();
}

function transactionIsFormattedCorrectly(
	transaction: Transaction
): VerificationResponse {
	// FOR PSET 2: Coinbase Transactions are always valid
	if ("height" in transaction) {
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
	transaction["inputs"].forEach((input) => {
		if (!("outpoint" in input)) {
			return {
				valid: false,
				msg: "Error: outpoint must be present in every input.",
			};
		}
		if(!("sig" in input)) {
			return {
				valid: false,
				msg: "Error: sig key must be present in every input.",
			};
		}else if (input["sig"] == null) {
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
	});

	transaction["outputs"].forEach((output) => {
		if (!("pubkey" in output) || !("value" in output)) {
			return {
				valid: false,
				msg: "Error: pubkey and value key must be present in every output.",
			};
		}
		if (
			!isNaN(Number(output["value"])) ||
			output["value"] < 0 ||
			Math.floor(output["value"]) != output["value"]
		) {
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
	});
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
	for (let i = 0; i < inputs.length; i++) {
		const input = inputs[i];
		const outpoint: Outpoint = input.outpoint;
		const response = await outpointExists(outpoint);

		if (!response["exists"]) {
			return { valid: false, msg: "Error: outpoint does not exist." };
		}
		const prevTransactionBody: Transaction = response["obj"];
		if (outpoint.index >= prevTransactionBody.outputs.length) {
			return {
				valid: false,
				msg: "Error: index provided not does not corresponding to any output of outpoint's transaction body.",
			};
		}
		try {
			const sigToVerify = Uint8Array.from(Buffer.from(input.sig, "hex"));
			const pubKey = Uint8Array.from(
				Buffer.from(prevTransactionBody.outputs[outpoint.index]["pubkey"], "hex")
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
	return { valid: true };
}
