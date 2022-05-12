/**
 * @author Michael D. Nath, Kenan Hasanaliyev, Gabriel Greenstein
 * @email mnath@stanford.edu, kenanhas@stanford.edu, gbg222@stanford.edu
 * @create date 2022-04-02
 * @modify date 2022-04-02
 * @desc [description]
 */
// TODO:
// Make data property of ValidationMessage work with JSON

import { BlockList, Socket } from "net";

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
	outpoint: Outpoint;
	sig: string;
}

export interface Outpoint extends Object {
	txid: string;
	index: number;
}

export interface TransactionOutput {
	value: number;
	pubkey: string;
}

export interface Transaction extends Object {
	type: "transaction";
	inputs?: [TransactionInput]; // coinbase txs have no inputs
	height?: number; // non-coinbase txs have no height key
	outputs: [TransactionOutput];
}

export interface PendingBlock extends Object {
	block: Block;
	socket: Socket;
	txids: Set<String>;
}

export interface Block extends Object {
	type: "block";
	txids: string[];
	created: number
	nonce: string;
	previd: string;
	miner?: string;
	T: string;
	note?: string;
}

export type ApplicationObject = Transaction | Block;

export interface VerificationResponse {
	exists?: boolean;
	valid?: boolean;
	msg?: string;
	obj?: Transaction;
	data?: any;
}

export interface TransactionRequest {
	missing: boolean;
	txids: Set<string>;
}

export interface ChainTip {
	block: Block;
	height: number;
}

export interface ChainTipMessage {
	type: "chaintip";
	blockid: string; 
}

export type HashToObjectMap = Map<string, ApplicationObject>;
