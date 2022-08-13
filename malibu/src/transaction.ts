import { ObjectId, objectManager } from './object'
import { TransactionInputObjectType,
         TransactionObjectType,
         TransactionOutputObjectType,
         OutpointObjectType,
         SpendingTransactionObject } from './message'
import { PublicKey, Signature } from './crypto/signature'
import { canonicalize } from 'json-canonicalize'
import { ver } from './crypto/signature'
import { logger } from './logger'
import { Block } from './block'

export class Output {
  pubkey: PublicKey
  value: number

  static fromNetworkObject(outputMsg: TransactionOutputObjectType): Output {
    return new Output(outputMsg.pubkey, outputMsg.value)
  }
  constructor(pubkey: PublicKey, value: number) {
    this.pubkey = pubkey
    this.value = value
  }
  toNetworkObject(): TransactionOutputObjectType {
    return {
      pubkey: this.pubkey,
      value: this.value
    }
  }
}

export class Outpoint {
  txid: ObjectId
  index: number

  static fromNetworkObject(outpoint: OutpointObjectType): Outpoint {
    return new Outpoint(outpoint.txid, outpoint.index)
  }
  constructor(txid: ObjectId, index: number) {
    this.txid = txid
    this.index = index
  }
  async resolve(): Promise<Output> {
    const refTxMsg = await objectManager.get(this.txid)
    const refTx = Transaction.fromNetworkObject(refTxMsg)

    if (this.index >= refTx.outputs.length) {
      throw new Error(`Invalid index reference ${this.index} for transaction ${this.txid}. The transaction only has ${refTx.outputs.length} outputs.`)
    }
    return refTx.outputs[this.index]
  }
  toNetworkObject(): OutpointObjectType {
    return {
      txid: this.txid,
      index: this.index
    }
  }
  toString() {
    return `<outpoint: (${this.txid}, ${this.index})>`
  }
}

export class Input {
  outpoint: Outpoint
  sig: Signature | null

  static fromNetworkObject(inputMsg: TransactionInputObjectType): Input {
    return new Input(
      Outpoint.fromNetworkObject(inputMsg.outpoint),
      inputMsg.sig
    )
  }
  constructor(outpoint: Outpoint, sig: Signature | null = null) {
    this.outpoint = outpoint
    this.sig = sig
  }
  toNetworkObject(): TransactionInputObjectType {
    return {
      outpoint: this.outpoint.toNetworkObject(),
      sig: this.sig
    }
  }
  toUnsigned(): Input {
    return new Input(this.outpoint)
  }
}

export class Transaction {
  txid: ObjectId
  inputs: Input[] = []
  outputs: Output[] = []
  height: number | null = null
  fees: number | undefined

  static inputsFromNetworkObject(inputMsgs: TransactionInputObjectType[]) {
    return inputMsgs.map(Input.fromNetworkObject)
  }
  static outputsFromNetworkObject(outputMsgs: TransactionOutputObjectType[]) {
    return outputMsgs.map(Output.fromNetworkObject)
  }
  static fromNetworkObject(txObj: TransactionObjectType): Transaction {
    let inputs: Input[] = []
    let height: number | null = null

    if (SpendingTransactionObject.guard(txObj)) {
      inputs = Transaction.inputsFromNetworkObject(txObj.inputs)
    }
    else {
      height = txObj.height
    }
    const outputs = Transaction.outputsFromNetworkObject(txObj.outputs)

    return new Transaction(objectManager.id(txObj), inputs, outputs, height)
  }
  static async byId(txid: ObjectId): Promise<Transaction> {
    return this.fromNetworkObject(await objectManager.get(txid))
  }
  constructor(txid: ObjectId, inputs: Input[], outputs: Output[], height: number | null = null) {
    this.txid = txid
    this.inputs = inputs
    this.outputs = outputs
    this.height = height
  }
  isCoinbase() {
    return this.inputs.length === 0
  }
  async validate(idx?: number, block?: Block) {
    logger.debug(`Validating transaction ${this.txid}`)
    const unsignedTxStr = canonicalize(this.toNetworkObject(false))

    if (this.isCoinbase()) {
      if (this.outputs.length > 1) {
        throw new Error(`Invalid coinbase transaction ${this.txid}. Coinbase must have only a single output.`)
      }
      if (block !== undefined && idx !== undefined) {
        // validating coinbase transaction in the context of a block
        if (idx > 0) {
          throw new Error(`Coinbase transaction ${this.txid} must be the first in block.`)
        }
      }
      this.fees = 0
      return
    }

    let blockCoinbase: Transaction

    if (block !== undefined) {
      try {
        blockCoinbase = await block.getCoinbase()
      }
      catch (e) {}
    }

    const inputValues = await Promise.all(
      this.inputs.map(async (input, i) => {
        if (blockCoinbase !== undefined && input.outpoint.txid === blockCoinbase.txid) {
          throw new Error(`Transaction ${this.txid} is spending immature coinbase`)
        }

        const prevOutput = await input.outpoint.resolve()

        if (input.sig === null) {
          throw new Error(`No signature available for input ${i} of transaction ${this.txid}`)
        }
        if (!await ver(input.sig, unsignedTxStr, prevOutput.pubkey)) {
          throw new Error(`Signature validation failed for input ${i} of transaction ${this.txid}`)
        }

        return prevOutput.value
      })
    )
    let sumInputs = 0
    let sumOutputs = 0

    logger.debug(`Checking the law of conservation for transaction ${this.txid}`)
    for (const inputValue of inputValues) {
      sumInputs += inputValue
    }
    logger.debug(`Sum of inputs is ${sumInputs}`)
    for (const output of this.outputs) {
      sumOutputs += output.value
    }
    logger.debug(`Sum of outputs is ${sumOutputs}`)
    if (sumInputs < sumOutputs) {
      throw new Error(`Transaction ${this.txid} does not respect the Law of Conservation. Inputs summed to ${sumInputs}, while outputs summed to ${sumOutputs}.`)
    }
    this.fees = sumInputs - sumOutputs
    logger.debug(`Transaction ${this.txid} pays fees ${this.fees}`)
    logger.debug(`Transaction ${this.txid} is valid`)
  }
  inputsUnsigned() {
    return this.inputs.map(
      input => input.toUnsigned().toNetworkObject()
    )
  }
  toNetworkObject(signed: boolean = true): TransactionObjectType {
    const outputObjs = this.outputs.map(output => output.toNetworkObject())

    if (this.height !== null) {
      // coinbase
      return {
        type: 'transaction',
        outputs: outputObjs,
        height: this.height
      }
    }
    if (signed) {
      return {
        type: 'transaction',
        inputs: this.inputs.map(input => input.toNetworkObject()),
        outputs: outputObjs
      }
    }
    return {
      type: 'transaction',
      inputs: this.inputsUnsigned(),
      outputs: outputObjs
    }
  }
  toString() {
    return `<Transaction ${this.txid}>`
  }
}
