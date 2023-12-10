import EventEmitter from 'eventemitter3'
import Peer, { DataConnection } from 'peerjs'

export enum MESSAGES {
  UPDATE_PLAYER = 'UPDATE_PLAYER',
  UPDATE_GAME = 'UPDATE_GAME',
  GET_PLAYER = 'GET_PLAYER',
  CHOSE_IMAGE = 'CHOSE_IMAGE',
  OK_NEXT_TEAM = 'OK_NEXT_TEAM',
  HINT_IMAGE = 'HINT_IMAGE',
  PLAYER_DISCONNECTED = 'PLAYER_DISCONNECTED',
  PING = 'PING',
  PONG = 'PONG',
}

export interface SocketMessage {
  message: MESSAGES,
  data: any
}

interface PeerJsClient {
  connection: DataConnection,
  pingMs: number
  lastSendPingTimestamp: number
}

export type PeerJsClientMap = Record<string, PeerJsClient>

export type OnMessageCb = (message: SocketMessage) => void
export type OnClientsUpdate = (clientId: string, clients: PeerJsClientMap) => void

export interface PeerJsWrapperEvent {
  peerDisconnect: () => void
  message: OnMessageCb
  hostConnect: (hostId: string) => void
  hostDisconnect: () => void
  clientUpdates: (clients: PeerJsClientMap) => void
  clientDisconnect: OnClientsUpdate
}

const PING_MESSAGE_INTERVAL_MS = 3000
const PONG_MESSAGE_TIMEOUT = 3000

class PeerJsWrapper extends EventEmitter<PeerJsWrapperEvent> {
  private static instance: PeerJsWrapper

  private peer: Peer | undefined
  private host: DataConnection | undefined = undefined
  private clients: PeerJsClientMap = {}

  private pingPongTimeouts: Record<string, number> = {} // keeps track of ping-pong timeouts

  private constructor() {
    super()
  }

  private sendToClient(clientId: string, message: SocketMessage) {
    const client = this.clients[clientId]
    if (!client) throw new Error(`Client ${clientId} not found, can not send message`)
    client.connection.send(message)
  }

  private sendToHost(message: SocketMessage) {
    if (!this.host) throw new Error('Host not found, can not send message')
    this.host.send(message)
  }

  private onClientDisconnection = (clientId: string) => {
    this.clearPingPongInterval(clientId)
    delete this.clients[clientId]
    this.emit('clientDisconnect', clientId, this.clients)
  }

  private onHostDisconnection = (hostId: string) => {
    this.clearPingPongInterval(hostId)
    this.host = undefined
    this.emit('hostDisconnect')
  }

  private onData = (data: SocketMessage, fromId: string) => {
    const { message } = data
    if (message === MESSAGES.PING) return this.onPing()
    if (message === MESSAGES.PONG) return this.onPong(fromId)
    this.emit('message', data)
  }

  // ------------------ --------------------- ------------------
  // ------------------ 🏓 PING-PONG protocol ------------------
  /**
   * The PING-PONG protocol monitor the connectivity and responsiveness (ping)
   * between the host and clients in a PeerJsWrapper instance.
   *
   * In this implementation, the PING-PONG protocol works as follows:
   *  |   HOST     |   CLIENT   |
   *  |------------|------------|
   *  |            |            |
   *  |     🏓 --- PING -->     |
   *  |            |            |
   *  |       <-- PONG --- 🏓   |
   *  |            |            |
   *  |            ⏱️           |
   *  |            |            |
   *  |     🏓 --- PING -->     |
   *  |            |            |
   *  |       <-- PONG --- 🏓   |
   *  |           ...           |
   *
   *
   *  ❌ If the host does not receive a PONG message from a client within a specified timeout period,
   *     it considers the client disconnected.
   *  ❌ If a client does not receive a PING message from the host within a specified timeout period,
   *     it considers the host disconnected.
   */

  private clearPingPongInterval = (id: string) => {
    clearTimeout(this.pingPongTimeouts[id])
    delete this.pingPongTimeouts[id]
  }

  private sendPing(clientId: string) {
    const client = this.clients[clientId]
    if (!client) return
    client.lastSendPingTimestamp = Date.now()
    this.pingPongTimeouts[clientId] = window.setTimeout(() => this.onClientDisconnection(clientId), PONG_MESSAGE_TIMEOUT)
    this.sendToClient(clientId, { message: MESSAGES.PING, data: {} })
  }

  private sendPong() {
    this.sendToHost({ message: MESSAGES.PONG, data: {} })
  }

  private onPing = () => {
    if (!this.host) return
    this.sendPong()
    const hostId = this.host.peer
    this.clearPingPongInterval(hostId)
    this.pingPongTimeouts[hostId] = window.setTimeout(
      () => this.onHostDisconnection(hostId),
      2 * PING_MESSAGE_INTERVAL_MS
    )
  }

  private onPong = (clientId: string) => {
    const client = this.clients[clientId]
    if (!client) {
      console.error('Client not found, can not update', clientId)
      return
    }
    clearTimeout(this.pingPongTimeouts[clientId])
    delete this.pingPongTimeouts[clientId]
    client.pingMs = Date.now() - client.lastSendPingTimestamp
    this.emit('clientUpdates', this.clients)

    window.setTimeout(() => this.sendPing(clientId), PING_MESSAGE_INTERVAL_MS)
  }

  // ------------------ 🏓 PING-PONG protocol ------------------
  // ------------------ --------------------- ------------------

  private onClientConnectionOpen = (client: DataConnection) => {
    const clientId = client.peer

    client.on('close', () => this.onClientDisconnection(clientId))
    client.on('data', dataMessage => this.onData(dataMessage as SocketMessage, clientId))
    client.on('open', () => {
      this.clients[clientId] = { connection: client, pingMs: 0, lastSendPingTimestamp: 0 }
      this.sendMessage(MESSAGES.GET_PLAYER, {})
      this.sendPing(clientId)
      this.emit('clientUpdates', this.clients)
    })
    client.on('error', (err) => console.error(`Client connection error with type$ ${err.type}`, err))
  }

  public static getInstance(): PeerJsWrapper {
    if (!PeerJsWrapper.instance) {
      PeerJsWrapper.instance = new PeerJsWrapper()
    }
    return PeerJsWrapper.instance
  }

  public init = () => new Promise<string>((resolve, reject) => {
    if (this.peer) reject("Peer already initialized")
    const peer = new Peer()
    peer.on('open', id => {
      this.peer = peer
      resolve(id)
    })
    peer.on('error', err => {
      console.error(`Peer error with type ${err.type}`, err)
      reject(err)
    })
    peer.on('close', () => {
      // To be extra certain that peers clean up correctly,
      // we recommend calling peer.destroy() on a peer when it is no longer needed.
      // > https://peerjs.com/docs/#peeron-close
      peer.destroy()
      this.emit('peerDisconnect')
    })
    peer.on('disconnected', () => this.emit('peerDisconnect'))
    peer.on('connection', client => this.onClientConnectionOpen(client))
  })

  public sendMessage(message: MESSAGES, data: any) {
    const messageData: SocketMessage = { message, data }
    if (this.host) this.sendToHost(messageData)
    else Object.keys(this.clients).forEach(clientId => this.sendToClient(clientId, messageData))
  }

  public connectToHost(hostId: string) {
    if (!this.peer) throw new Error('Peer not initialized')
    const hostConnection = this.peer.connect(hostId)
    hostConnection.on('open', () => {
      this.host = hostConnection
      this.emit('hostConnect', hostId)
    })
    hostConnection.on('data', (data) => this.onData(data as SocketMessage, hostId))
    hostConnection.on('close', () => this.onHostDisconnection(hostId))
    hostConnection.on('error', (err) => console.error('Host connection error', err))
  }

}

export default PeerJsWrapper.getInstance()

