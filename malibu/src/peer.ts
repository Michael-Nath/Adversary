import { logger } from './logger'
import { MessageSocket } from './network'
import semver from 'semver'
import { Messages,
         Message,
         HelloMessage,
         PeersMessage, GetPeersMessage,
         IHaveObjectMessage, GetObjectMessage, ObjectMessage,
         GetChainTipMessage, ChainTipMessage,
         ErrorMessage,
         MessageType,
         HelloMessageType,
         PeersMessageType, GetPeersMessageType,
         IHaveObjectMessageType, GetObjectMessageType, ObjectMessageType,
         GetChainTipMessageType, ChainTipMessageType,
         ErrorMessageType,
         GetMemPoolMessageType,
         MempoolMessageType
        } from './message'
import { peerManager } from './peermanager'
import { canonicalize } from 'json-canonicalize'
import { db, objectManager } from './object'
import { network } from './network'
import { ObjectId } from './object'
import { chainManager } from './chain'
import { mempool } from './mempool'

const VERSION = '0.8.0'
const NAME = 'Malibu (pset5)'

// Number of peers that each peer is allowed to report to us
const MAX_PEERS_PER_PEER = 30

export class Peer {
  active: boolean = false
  socket: MessageSocket
  handshakeCompleted: boolean = false
  peerAddr: string

  async sendHello() {
    this.sendMessage({
      type: 'hello',
      version: VERSION,
      agent: NAME
    })
  }
  async sendGetPeers() {
    this.sendMessage({
      type: 'getpeers'
    })
  }
  async sendPeers() {
    this.sendMessage({
      type: 'peers',
      peers: [...peerManager.knownPeers]
    })
  }
  async sendIHaveObject(obj: any) {
    this.sendMessage({
      type: 'ihaveobject',
      objectid: objectManager.id(obj)
    })
  }
  async sendObject(obj: any) {
    this.sendMessage({
      type: 'object',
      object: obj
    })
  }
  async sendGetObject(objid: ObjectId) {
    this.sendMessage({
      type: 'getobject',
      objectid: objid
    })
  }
  async sendGetChainTip() {
    this.sendMessage({
      type: 'getchaintip'
    })
  }
  async sendChainTip(blockid: ObjectId) {
    this.sendMessage({
      type: 'chaintip',
      blockid
    })
  }
  async sendGetMempool() {
    this.sendMessage({
      type: 'getmempool'
    })
  }
  async sendMempool(txids: ObjectId[]) {
    this.sendMessage({
      type: 'mempool',
      txids
    })
  }
  async sendError(err: string) {
    this.sendMessage({
      type: 'error',
      error: err
    })
  }
  sendMessage(obj: object) {
    const message: string = canonicalize(obj)

    this.debug(`Sending message: ${message}`)
    this.socket.sendMessage(message)
  }
  async fatalError(err: string) {
    await this.sendError(err)
    this.warn(`Peer error: ${err}`)
    this.fail()
  }
  async fail() {
    this.active = false
    this.socket.end()
    peerManager.peerFailed(this.peerAddr)
  }
  async onConnect() {
    this.active = true
    await this.sendHello()
    await this.sendGetPeers()
    await this.sendGetChainTip()
    await this.sendGetMempool()
  }
  async onMessage(message: string) {
    this.debug(`Message arrival: ${message}`)

    let msg: object

    try {
      msg = JSON.parse(message)
      this.debug(`Parsed message into: ${JSON.stringify(msg)}`)
    }
    catch {
      return await this.fatalError(`Failed to parse incoming message as JSON: ${message}`)
    }
    if (!Message.guard(msg)) {
      const validation = Message.validate(msg)
      return await this.fatalError(
        `The received message does not match one of the known message formats: ${message}
         Validation error: ${JSON.stringify(validation)}`
      )
    }
    if (!this.handshakeCompleted) {
      if (HelloMessage.guard(msg)) {
        return this.onMessageHello(msg)
      }
      return await this.fatalError(`Received message ${message} prior to "hello"`)
    }
    Message.match(
      async () => {
        return await this.fatalError(`Received a second "hello" message, even though handshake is completed`)
      },
      this.onMessageGetPeers.bind(this),
      this.onMessagePeers.bind(this),
      this.onMessageIHaveObject.bind(this),
      this.onMessageGetObject.bind(this),
      this.onMessageObject.bind(this),
      this.onMessageGetChainTip.bind(this),
      this.onMessageChainTip.bind(this),
      this.onMessageGetMempool.bind(this),
      this.onMessageMempool.bind(this),
      this.onMessageError.bind(this)
    )(msg)
  }
  async onMessageHello(msg: HelloMessageType) {
    if (!semver.satisfies(msg.version, `^${VERSION}`)) {
      return await this.fatalError(`You sent an incorrect version (${msg.version}), which is not compatible with this node's version ${VERSION}.`)
    }
    this.info(`Handshake completed. Remote peer running ${msg.agent} at protocol version ${msg.version}`)
    this.handshakeCompleted = true
  }
  async onMessagePeers(msg: PeersMessageType) {
    for (const peer of msg.peers.slice(0, MAX_PEERS_PER_PEER)) {
      this.info(`Remote party reports knowledge of peer ${peer}`)

      peerManager.peerDiscovered(peer)
    }
    if (msg.peers.length > MAX_PEERS_PER_PEER) {
      this.info(`Remote party reported ${msg.peers.length} peers, but we processed only ${MAX_PEERS_PER_PEER} of them.`)
    }
  }
  async onMessageGetPeers(msg: GetPeersMessageType) {
    this.info(`Remote party is requesting peers. Sharing.`)
    await this.sendPeers()
  }
  async onMessageIHaveObject(msg: IHaveObjectMessageType) {
    this.info(`Peer claims knowledge of: ${msg.objectid}`)

    if (!await db.exists(msg.objectid)) {
      this.info(`Object ${msg.objectid} discovered`)
      await this.sendGetObject(msg.objectid)
    }
  }
  async onMessageGetObject(msg: GetObjectMessageType) {
    this.info(`Peer requested object with id: ${msg.objectid}`)

    let obj
    try {
      obj = await objectManager.get(msg.objectid)
    }
    catch (e) {
      this.warn(`We don't have the requested object with id: ${msg.objectid}`)
      this.sendError(`Unknown object with id ${msg.objectid}`)
      return
    }
    await this.sendObject(obj)
  }
  async onMessageObject(msg: ObjectMessageType) {
    const objectid: ObjectId = objectManager.id(msg.object)
    let known: boolean = false

    this.info(`Received object with id ${objectid}: %o`, msg.object)

    known = await objectManager.exists(objectid)

    if (known) {
      this.debug(`Object with id ${objectid} is already known`)
    }
    else {
      this.info(`New object with id ${objectid} downloaded: %o`, msg.object)

      // store object even if it is invalid
      await objectManager.put(msg.object)
    }

    try {
      await objectManager.validate(msg.object, this)
    }
    catch (e: any) {
      this.sendError(`Received invalid object: ${e.message}`)
      return
    }

    if (!known) {
      // gossip
      network.broadcast({
        type: 'ihaveobject',
        objectid
      })
    }
  }
  async onMessageGetChainTip(msg: GetChainTipMessageType) {
    if (chainManager.longestChainTip === null) {
      this.warn(`Chain was not initialized when a peer requested it`)
      return
    }
    this.sendChainTip(chainManager.longestChainTip.blockid)
  }
  async onMessageChainTip(msg: ChainTipMessageType) {
    if (await objectManager.exists(msg.blockid)) {
      return
    }
    this.sendGetObject(msg.blockid)
  }
  async onMessageGetMempool(msg: GetMemPoolMessageType) {
    const txids = []

    for (const tx of mempool.txs) {
      txids.push(tx.txid)
    }
    this.sendMempool(txids)
  }
  async onMessageMempool(msg: MempoolMessageType) {
    for (const txid of msg.txids) {
      objectManager.retrieve(txid, this) // intentionally delayed
    }
  }
  async onMessageError(msg: ErrorMessageType) {
    this.warn(`Peer reported error: ${msg.error}`)
  }
  log(level: string, message: string, ...args: any[]) {
    logger.log(
      level,
      `[peer ${this.socket.peerAddr}:${this.socket.netSocket.remotePort}] ${message}`,
      ...args
    )
  }
  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args)
  }
  info(message: string, ...args: any[]) {
    this.log('info', message, ...args)
  }
  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args)
  }
  constructor(socket: MessageSocket, peerAddr: string) {
    this.socket = socket
    this.peerAddr = peerAddr

    socket.netSocket.on('connect', this.onConnect.bind(this))
    socket.netSocket.on('error', err => {
      this.warn(`Socket error: ${err}`)
      this.fail()
    })
    socket.on('message', this.onMessage.bind(this))
  }
}
