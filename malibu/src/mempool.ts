import { Block } from './block'
import { Chain } from './chain'
import { logger } from './logger'
import { db, ObjectId, objectManager } from './object'
import { Transaction } from './transaction'
import { UTXOSet } from './utxo'

class MemPool {
  txs: Transaction[] = []
  state: UTXOSet | undefined

  async init() {
    await this.load()
    logger.debug('Mempool initialized')
  }
  getTxIds(): ObjectId[] {
    const txids = this.txs.map(tx => tx.txid)

    // logger.debug(`Mempool txids: ${txids}`)

    return txids
  }
  async fromTxIds(txids: ObjectId[]) {
    this.txs = []

    for (const txid of txids) {
      this.txs.push(Transaction.fromNetworkObject(await objectManager.get(txid)))
    }
  }
  async save() {
    if (this.state === undefined) {
      throw new Error('Could not save undefined state of mempool to cache.')
    }
    await db.put('mempool:txids', this.getTxIds())
    await db.put('mempool:state', Array.from(this.state.outpoints))
  }
  async load() {
    try {
      const txids = await db.get('mempool:txids')
      logger.debug(`Retrieved cached mempool: ${txids}.`)
      this.fromTxIds(txids)
    }
    catch {
      // start with an empty mempool of no transactions
    }
    try {
      logger.debug(`Loading mempool state from cache`)
      const outpoints = await db.get('mempool:state')
      logger.debug(`Outpoints loaded from cache: ${outpoints}`)
      this.state = new UTXOSet(new Set<string>(outpoints))
    }
    catch {
      // start with an empty state
      this.state = new UTXOSet(new Set())
    }
  }
  async onTransactionArrival(tx: Transaction): Promise<boolean> {
    try {
      await this.state?.apply(tx)
    }
    catch (e: any) {
      // failed to apply transaction to mempool, ignore it
      logger.debug(`Failed to add transaction ${tx.txid} to mempool: ${e.message}.`)
      return false
    }
    logger.debug(`Added transaction ${tx.txid} to mempool`)
    this.txs.push(tx)
    await this.save()
    return true
  }
  async reorg(lca: Block, shortFork: Chain, longFork: Chain) {
    logger.info('Reorganizing mempool due to longer chain adoption.')

    const oldMempoolTxs: Transaction[] = this.txs
    let orphanedTxs: Transaction[] = []

    for (const block of shortFork.blocks) {
      orphanedTxs = orphanedTxs.concat(await block.getTxs())
    }
    logger.info(`Old mempool had ${oldMempoolTxs.length} transaction(s): ${oldMempoolTxs}`)
    logger.info(`${orphanedTxs.length} transaction(s) in ${shortFork.blocks.length} block(s) were orphaned: ${orphanedTxs}`)
    orphanedTxs = orphanedTxs.concat(oldMempoolTxs)

    this.txs = []

    const tip = longFork.blocks[longFork.blocks.length - 1]
    if (tip.stateAfter === undefined) {
      throw new Error(`Attempted a mempool reorg with tip ${tip.blockid} for which no state has been calculted.`)
    }
    this.state = tip.stateAfter

    let successes = 0
    for (const tx of orphanedTxs) {
      const success = await this.onTransactionArrival(tx)

      if (success) {
        ++successes
      }
    }
    logger.info(`Re-applied ${successes} transaction(s) to mempool.`)
    logger.info(`${successes - orphanedTxs.length} transactions were abandoned.`)
    logger.info(`Mempool reorg completed.`)
  }
}

export const mempool = new MemPool()
