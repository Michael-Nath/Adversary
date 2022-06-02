import { Block } from "./block";
import { logger } from "./logger";
import { mempool } from "./mempool";
import { db } from "./object";

class ChainManager {
  longestChainHeight: number = 0
  longestChainTip: Block | null = null

  async init() {
    let tip, height, inited = false

    try {
      [tip, height] = await db.get('longestchain')
      logger.debug(`Retrieved cached longest chain tip ${tip.blockid} at height ${height}.`)
    }
    catch {
      tip = await Block.makeGenesis()
      height = 0
      logger.debug(`No cached longest chain exists. Initializing to genesis ${tip.blockid} at height ${height}.`)
      inited = true
    }
    this.longestChainTip = await Block.fromNetworkObject(tip)
    this.longestChainHeight = height
    if (inited) {
      await this.save()
    }
    logger.debug(`Chain manager initialized.`)
  }
  async save() {
    await db.put('longestchain', [this.longestChainTip, this.longestChainHeight])
  }
  async onValidBlockArrival(block: Block) {
    if (!block.valid) {
      throw new Error(`Received onValidBlockArrival() call for invalid block ${block.blockid}`)
    }
    const height = block.height

    if (this.longestChainTip === null) {
      throw new Error('We do not have a local chain to compare against')
    }
    if (height === undefined) {
      throw new Error(`We received a block ${block.blockid} we thought was valid, but had no calculated height.`)
    }
    if (height > this.longestChainHeight) {
      logger.debug(`New longest chain has height ${height} and tip ${block.blockid}`)
      const [lca, shortFork, longFork] = await Chain.getForks(this.longestChainTip, block)
      if (shortFork.blocks.length !== 0) {
        logger.info(`Reorged chain by abandoning a temporary fork of `
                  + `length ${shortFork.blocks.length}, `
                  + `tip ${this.longestChainTip.blockid}, `
                  + `and height ${this.longestChainHeight} and adopting a chain of `
                  + `height ${height} and tip ${block.blockid}.`)
      }
      this.longestChainHeight = height
      this.longestChainTip = block
      await mempool.reorg(lca, shortFork, longFork)
      await this.save()
    }
  }
}

export class Chain {
  blocks: Block[]

  constructor(blocks: Block[]) {
    this.blocks = blocks
  }
  // Given two blocks b1, b2, of which b2 belongs to the longer chain,
  // find the LCA block between the two respective chains and return an array of
  // 1. The LCA
  // 2. The fork LCA..b1
  // 3. The fork LCA..b2
  static async getForks(b1: Block, b2: Block): Promise<[Block, Chain, Chain]> {
    if (!b1.valid) {
      throw new Error(`Attempted to compare forks of blocks ${b1.blockid} and ${b2.blockid}, but ${b1.blockid} is invalid.`)
    }
    if (!b2.valid) {
      throw new Error(`Attempted to compare forks of blocks ${b1.blockid} and ${b2.blockid}, but ${b2.blockid} is invalid.`)
    }
    if (b1.blockid === b2.blockid) {
      return [b1, new Chain([]), new Chain([])]
    }

    const l1 = b1.height
    const l2 = b2.height

    if (l1 === null || l2 === null) {
      throw new Error('Attempting to get forks between chains with no known length')
    }
    const b2Parent = await b2.loadParent()
    if (b2Parent === null) {
      throw new Error('Attempting to get forks between chains with no shared ancestor')
    }
    if (l1 === l2) {
      const b1Parent = await b1.loadParent()
      if (b1Parent === null) {
        throw new Error('Attempting to get forks between chains with no shared ancestor')
      }
      const [lca, b1Fork, b2Fork] = await Chain.getForks(b1Parent, b2Parent)

      b1Fork.blocks.push(b1)
      b2Fork.blocks.push(b2)

      return [lca, b1Fork, b2Fork]
    }

    const [lca, shortFork, longFork] = await Chain.getForks(b1, b2Parent)
    longFork.blocks.push(b2)

    return [lca, shortFork, longFork]
  }
}

export const chainManager = new ChainManager()
