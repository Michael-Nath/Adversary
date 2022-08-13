import { Block } from './block'
import { logger } from './logger'
import { OutpointObject, OutpointObjectType } from './message'
import { db, ObjectId } from './object'
import { Outpoint, Transaction } from './transaction'

export type UTXO = Set<string>

export class UTXOSet {
  outpoints: UTXO = new Set<string>()

  constructor(outpoints: UTXO) {
    this.outpoints = outpoints
  }
  copy() {
    return new UTXOSet(new Set<string>(Array.from(this.outpoints)))
  }
  async apply(tx: Transaction, idx?: number, block?: Block) {
    logger.debug(`Applying transaction ${tx.txid} to UTXO set`)
    logger.debug(`Transaction ${tx.txid} has fees ${tx.fees}`)

    const seen: Set<string> = new Set<string>()

    logger.debug(`Checking ${tx.inputs.length} inputs of transaction ${tx.txid} against the UTXO set.`)
    for (const input of tx.inputs) {
      logger.debug(`Checking input ${input.outpoint} of transaction ${tx.txid} against the UTXO set.`)
      const outpointStr: string = input.outpoint.toString()

      logger.debug(`Checking to see if outpoint ${outpointStr} is unspent in UTXO outpoints ${this.outpoints}.`)
      if (!this.outpoints.has(outpointStr)) {
        logger.debug(`Transaction ${tx.txid} consumes ${outpointStr} which is not in the UTXO set.`)
        throw new Error(`Transaction consumes output (${JSON.stringify(outpointStr)}) that is not in the UTXO set. ` +
                        `This is either a double spend, or a spend of a transaction we have not seen before.`)
      }
      logger.debug(`Outpoint ${outpointStr} is unspent.`)
      logger.debug(`Checking if outpoint ${outpointStr} is being respent in the same tx.`)
      if (seen.has(outpointStr)) {
        logger.debug(`Transaction ${tx.txid} has two different inputs spending the same outpoint ${outpointStr}`)
        throw new Error('Two different inputs of the same transaction are spending the same outpoint')
      }
      logger.debug(`Outpoint ${outpointStr} has not been spent in the same tx.`)
      logger.debug(`Input is valid`)
      seen.add(outpointStr)
    }
    logger.debug(`Transaction is valid with respect to UTXO set`)
    // Transaction is valid wrt state; apply it
    for (const input of tx.inputs) {
      this.outpoints.delete(input.outpoint.toString())
    }
    logger.debug(`Adding ${tx.outputs.length} outputs to UTXO set`)
    for (let i = 0; i < tx.outputs.length; ++i) {
      this.outpoints.add((new Outpoint(tx.txid, i)).toString())
    }
    logger.debug(`Outpoints set after tx application: ${this}`)
  }
  async applyMultiple(txs: Transaction[], block?: Block) {
    let idx = 0

    for (const tx of txs) {
      logger.debug(`Applying transaction ${tx.txid} to state`)
      await this.apply(tx, idx, block)
      logger.debug(`State after transaction application is: ${this}`)
      ++idx
    }
  }
  toString() {
    return `UTXO set: ${JSON.stringify(Array.from(this.outpoints))}`
  }
}
