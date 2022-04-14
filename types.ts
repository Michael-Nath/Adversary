/**
 * @author Michael D. Nath, Kenan Hasanaliyev, Gabriel Greenstein
 * @email mnath@stanford.edu, kenanhas@stanford.edu, gbg222@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
// TODO:
// Make data property of ValidationMessage work with JSON

export interface ValidationMessage {
	valid: boolean;
	error: ErrorMessage;
	data: Object;
}

export interface Message {
	type: string;
}

export interface ErrorMessage extends Message {
	error: string;
}

export interface HelloMessage extends Message {
	version: string;
	agent: string;
}

export interface HashObjectMessage extends Message {
	objectid: string;
}

export interface ObjectMessage extends Message {
	object: Block | Transaction;
}

export interface TransactionInput {
	outpoint: { txid: string; index: number };
	sig: string;
}

export interface TransactionOutput {
	value: number;
	pubkey: string;
}

export interface Transaction {
	type: "transaction";
	inputs: [TransactionInput];
	outputs: [TransactionOutput];
}

export interface Block {
	type: "block";
	txids: [string];
	nonce: string;
	previd: string;
	miner?: string;
	note?: string;
}
