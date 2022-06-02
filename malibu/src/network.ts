import * as net from 'net'
import { logger } from './logger'
import { Peer } from './peer'
import { EventEmitter } from 'events'
import { peerManager } from './peermanager'

class Network {
  peers: Peer[] = []

  async init(bindPort: number, bindIP: string) {
    await peerManager.load()

    const server = net.createServer(socket => {
      logger.info(`New connection from peer ${socket.remoteAddress}`)
      const peer = new Peer(
        new MessageSocket(socket, `${socket.remoteAddress}:${socket.remotePort}`),
        `${socket.remoteAddress}:${socket.remotePort}`
      )
      this.peers.push(peer)
      peer.onConnect()
    })

    logger.info(`Listening for connections on port ${bindPort} and IP ${bindIP}`)
    server.listen(bindPort, bindIP)

    for (const peerAddr of peerManager.knownPeers) {
      logger.info(`Attempting connection to known peer ${peerAddr}`)
      try {
        const peer = new Peer(
          MessageSocket.createClient(peerAddr),
          peerAddr
        )
        this.peers.push(peer)
      }
      catch (e: any) {
        logger.warn(`Failed to create connection to peer ${peerAddr}: ${e.message}`)
      }
    }
  }
  broadcast(obj: object) {
    logger.info(`Broadcasting object to all peers: %o`, obj)

    for (const peer of this.peers) {
      if (peer.active) {
        peer.sendMessage(obj) // intentionally delayed
      }
    }
  }
}

export class MessageSocket extends EventEmitter {
  buffer: string = '' // defragmentation buffer
  netSocket: net.Socket
  peerAddr: string

  static createClient(peerAddr: string) {
    const [host, portStr] = peerAddr.split(':')
    const port = +portStr
    if (port < 0 || port > 65535) {
      throw new Error('Invalid port')
    }
    const netSocket = new net.Socket()
    const socket = new MessageSocket(netSocket, peerAddr)

    netSocket.connect(port, host)

    return socket
  }
  constructor(netSocket: net.Socket, peerAddr: string) {
    super()

    this.peerAddr = peerAddr
    this.netSocket = netSocket
    this.netSocket.on('data', (data: string) => {
      this.buffer += data
      const messages = this.buffer.split('\n')

      if (messages.length > 1) {
        for (const message of messages.slice(0, -1)) {
          this.emit('message', message)
        }
        this.buffer = messages[messages.length - 1]
      }
    })
  }
  sendMessage(message: string) {
    this.netSocket.write(`${message}\n`)
  }
  end() {
    this.netSocket.end()
  }
}

export const network = new Network()
