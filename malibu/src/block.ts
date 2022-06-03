import {
	BlockObject,
	BlockObjectType,
	TransactionObject,
	ObjectType,
} from "./message";
import { hash } from "./crypto/hash";
import { canonicalize } from "json-canonicalize";
import { Peer } from "./peer";
import { objectManager, ObjectId, db } from "./object";
import util from "util";
import { UTXOSet } from "./utxo";
import { logger } from "./logger";
import { Transaction } from "./transaction";
import { chainManager } from "./chain";
import { Deferred } from "./promise";
import { parentPort } from "worker_threads";

export const TARGET =
	"00000002af000000000000000000000000000000000000000000000000000000";
const GENESIS: BlockObjectType = {
	T: "00000002af000000000000000000000000000000000000000000000000000000",
	created: 1624219079,
	miner: "dionyziz",
	nonce: "0000000000000000000000000000000000000000000000000000002634878840",
	note: "The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage",
	previd: null,
	txids: [],
	type: "block",
};
const BU = 10 ** 12;
const BLOCK_REWARD = 50 * BU;

export class BlockManager {
	deferredValidations: { [key: string]: Deferred<boolean> } = {};
}

export const blockManager = new BlockManager();

export class Block {
	previd: string | null;
	txids: ObjectId[];
	nonce: string;
	T: string;
	created: number;
	miner: string | undefined;
	note: string | undefined;
	fees: number | undefined;
	stateAfter: UTXOSet | undefined;
	height: number | undefined;
	valid: boolean = false;

	get blockid(): string {
		return hash(canonicalize(this.toNetworkObject()));
	}

	public static async makeGenesis(): Promise<Block> {
		const genesis = await Block.fromNetworkObject(GENESIS);
		genesis.valid = true;
		genesis.stateAfter = new UTXOSet(new Set<string>());
		genesis.height = 0;
		await genesis.save();

		if (!(await objectManager.exists(genesis.blockid))) {
			await objectManager.put(genesis.toNetworkObject());
		}

		return genesis;
	}
	public static async fromNetworkObject(
		object: BlockObjectType
	): Promise<Block> {
		const b = new Block(
			object.previd,
			object.txids,
			object.nonce,
			object.T,
			object.created,
			object.miner,
			object.note
		);
		// see if we can load block metadata from cache
		try {
			await b.load();
		} catch {} // block metadata not cached
		return b;
	}
	constructor(
		previd: string | null,
		txids: string[],
		nonce: string,
		T: string,
		created: number,
		miner: string | undefined,
		note: string | undefined
	) {
		this.previd = previd;
		this.txids = txids;
		this.nonce = nonce;
		this.T = T;
		this.created = created;
		this.miner = miner;
		this.note = note;
	}
	async getCoinbase(): Promise<Transaction> {
		if (this.txids.length === 0) {
			throw new Error("The block has no coinbase transaction");
		}
		const txid = this.txids[0];
		logger.debug(`Checking whether ${txid} is the coinbase`);
		const obj = await objectManager.get(txid);

		if (!TransactionObject.guard(obj)) {
			throw new Error("The block contains non-transaction txids");
		}

		const tx: Transaction = Transaction.fromNetworkObject(obj);

		if (tx.isCoinbase()) {
			return tx;
		}
		throw new Error("The block has no coinbase transaction");
	}
	toNetworkObject() {
		const netObj: BlockObjectType = {
			type: "block",
			previd: this.previd,
			txids: this.txids,
			nonce: this.nonce,
			T: this.T,
			created: this.created,
			miner: this.miner,
		};

		if (this.note !== undefined) {
			netObj.note = this.note;
		}
		return netObj;
	}
	hasPoW(): boolean {
		// parentPort?.postMessage(this.blockid);
		return BigInt(`0x${this.blockid}`) <= BigInt(`0x${TARGET}`);
	}
	isGenesis(): boolean {
		return this.previd === null;
	}
	async getTxs(peer?: Peer): Promise<Transaction[]> {
		const txPromises: Promise<ObjectType>[] = [];
		let maybeTransactions: ObjectType[] = [];
		const txs: Transaction[] = [];

		for (const txid of this.txids) {
			if (peer === undefined) {
				txPromises.push(objectManager.get(txid));
			} else {
				txPromises.push(objectManager.retrieve(txid, peer));
			}
		}
		try {
			maybeTransactions = await Promise.all(txPromises);
		} catch (e) {
			throw new Error(
				`Retrieval of transactions of block ${this.blockid} failed; rejecting block`
			);
		}
		logger.debug(
			`We have all ${this.txids.length} transactions of block ${this.blockid}`
		);
		for (const maybeTx of maybeTransactions) {
			if (!TransactionObject.guard(maybeTx)) {
				throw new Error(
					`Block reports a transaction with id ${objectManager.id(
						maybeTx
					)}, but this is not a transaction.`
				);
			}
			const tx = Transaction.fromNetworkObject(maybeTx);
			txs.push(tx);
		}

		return txs;
	}
	async validateTx(peer: Peer, stateBefore: UTXOSet, height: number) {
		logger.debug(
			`Validating ${this.txids.length} transactions of block ${this.blockid}`
		);

		const stateAfter = stateBefore.copy();

		const txs = await this.getTxs(peer);

		for (const tx of txs) {
			await tx.validate();
		}

		await stateAfter.applyMultiple(txs, this);
		logger.debug(`UTXO state of block ${this.blockid} calculated`);

		let fees = 0;
		for (const tx of txs) {
			if (tx.fees === undefined) {
				throw new Error(`Transaction fees not calculated`);
			}
			fees += tx.fees;
		}
		this.fees = fees;

		let coinbase;

		try {
			coinbase = await this.getCoinbase();
		} catch (e) {}

		if (coinbase !== undefined) {
			if (coinbase.outputs[0].value > BLOCK_REWARD + fees) {
				throw new Error(
					`Coinbase transaction does not respect macroeconomic policy. ` +
						`Coinbase output was ${coinbase.outputs[0].value}, while reward is ${BLOCK_REWARD} and fees were ${fees}.`
				);
			}
			if (coinbase.height !== height) {
				throw new Error(
					`Coinbase transaction ${coinbase.txid} of block ${this.blockid} indicates height ${coinbase.height}, ` +
						`while the block has height ${height}.`
				);
			}
		}

		this.stateAfter = stateAfter;
		logger.debug(
			`UTXO state of block ${this.blockid} cached: ${JSON.stringify(
				Array.from(stateAfter.outpoints)
			)}`
		);
	}
	async loadParent(): Promise<Block | null> {
		let parentBlock: Block;

		if (this.previd === null) {
			return null;
		}
		try {
			const parentObject = await objectManager.get(this.previd);

			if (!BlockObject.guard(parentObject)) {
				return null;
			}
			parentBlock = await Block.fromNetworkObject(parentObject);
		} catch (e: any) {
			return null;
		}
		return parentBlock;
	}
	async validateAncestry(peer: Peer): Promise<Block | null> {
		if (this.previd === null) {
			// genesis
			return null;
		}

		let parentBlock: Block;
		try {
			logger.debug(
				`Retrieving parent block of ${this.blockid} (${this.previd})`
			);
			const parentObject = await objectManager.retrieve(this.previd, peer);

			if (!BlockObject.guard(parentObject)) {
				throw new Error(
					`Got parent of block ${this.blockid}, but it was not of BlockObject type; rejecting block.`
				);
			}
			parentBlock = await Block.fromNetworkObject(parentObject);

			try {
				// try to load cached block information; this should have been cached
				// as soon as the block was retrieved from the network and validated
				await parentBlock.load();
				logger.debug(
					`Parent block ${this.previd} of the block ${this.blockid} is already cached.`
				);
			} catch {
				logger.debug(
					`Awaiting validation of the parent block ${this.previd} of the block ${this.blockid}.`
				);
				await parentBlock.validate(peer);
			}
		} catch (e: any) {
			throw new Error(
				`Retrieval of block parent for block ${this.blockid} failed; rejecting block: ${e.message}`
			);
		}
		return parentBlock;
	}
	async validate(peer: Peer) {
		logger.debug(`Validating block ${this.blockid}`);

		if (blockManager.deferredValidations[this.blockid] !== undefined) {
			logger.debug(
				`Block ${this.blockid} is already pending validation. Waiting.`
			);
			const result: boolean = await blockManager.deferredValidations[
				this.blockid
			].promise;
			if (!result) {
				throw new Error(
					`Block validation failure received through propagation.`
				);
			}
			await this.load();
			return;
		}
		const deferred = (blockManager.deferredValidations[this.blockid] =
			new Deferred<boolean>());

		try {
			if (this.T !== TARGET) {
				throw new Error(
					`Block ${this.blockid} does not specify the fixed target ${TARGET}, but uses target ${this.T} instead.`
				);
			}
			logger.debug(`Block target for ${this.blockid} is valid`);
			if (!this.hasPoW()) {
				throw new Error(
					`Block ${this.blockid} does not satisfy the proof-of-work equation; rejecting block.`
				);
			}
			logger.debug(`Block proof-of-work for ${this.blockid} is valid`);

			let parentBlock: Block | null = null;
			let stateBefore: UTXOSet | undefined;

			if (this.isGenesis()) {
				this.height = 0;
				if (!util.isDeepStrictEqual(this.toNetworkObject(), GENESIS)) {
					throw new Error(
						`Invalid genesis block ${this.blockid}: ${JSON.stringify(
							this.toNetworkObject()
						)}`
					);
				}
				logger.debug(`Block ${this.blockid} is genesis block`);
				// genesis state
				stateBefore = new UTXOSet(new Set<string>());
				logger.debug(`State before block ${this.blockid} is the genesis state`);
			} else {
				parentBlock = await this.validateAncestry(peer);

				if (parentBlock === null) {
					throw new Error(`Parent block of block ${this.blockid} was null`);
				}

				logger.debug(`Ancestry validation of ${this.blockid} successful.`);

				const parentHeight = parentBlock.height;

				if (parentHeight === undefined) {
					throw new Error(
						`Parent block ${parentBlock.blockid} of block ${this.blockid} has no known height`
					);
				}

				if (parentBlock.created >= this.created) {
					throw new Error(
						`Parent block ${parentBlock.blockid} created at ${parentBlock.created} has future timestamp of ` +
							`block ${this.blockid} created at ${this.created}.`
					);
				}
				const currentUNIXtimestamp = Math.floor(new Date().getTime() / 1000);
				if (this.created > currentUNIXtimestamp) {
					throw new Error(
						`Block ${this.blockid} has a timestamp ${this.created} in the future. ` +
							`Current time is ${currentUNIXtimestamp}.`
					);
				}

				this.height = parentHeight + 1;
				logger.debug(`Block ${this.blockid} has height ${this.height}.`);

				// this block's starting state is the previous block's ending state
				stateBefore = parentBlock.stateAfter;
				logger.debug(`Loaded state before block ${this.blockid}`);
			}
			logger.debug(`Block ${this.blockid} has valid ancestry`);

			if (stateBefore === undefined) {
				throw new Error(
					`We have not calculated the state of the parent block,` +
						`so we cannot calculate the state of the current block with blockid = ${this.blockid}`
				);
			}

			logger.debug(`State before block ${this.blockid} is ${stateBefore}`);

			await this.validateTx(peer, stateBefore, this.height);
			logger.debug(`Block ${this.blockid} has valid transactions`);

			this.valid = true;
			await this.save();
			await chainManager.onValidBlockArrival(this);
		} catch (e: any) {
			deferred.resolve(false);
			delete blockManager.deferredValidations[this.blockid];
			throw e;
		}
		deferred.resolve(true);
		delete blockManager.deferredValidations[this.blockid];
	}
	async save() {
		if (this.stateAfter === undefined) {
			throw new Error(
				`Cannot save block ${this.blockid} with uncalculate state`
			);
		}

		await db.put(`blockinfo:${this.blockid}`, {
			height: this.height,
			stateAfterOutpoints: Array.from(this.stateAfter.outpoints),
		});
		logger.debug(`Stored valid block ${this.blockid} metadata.`);
	}
	async load() {
		logger.debug(`Loading block ${this.blockid} metadata.`);

		const { height, stateAfterOutpoints } = await db.get(
			`blockinfo:${this.blockid}`
		);

		logger.debug(`Block ${this.blockid} metadata loaded from database.`);

		this.height = height;
		this.stateAfter = new UTXOSet(new Set<string>(stateAfterOutpoints));
		this.valid = true;
	}
}
