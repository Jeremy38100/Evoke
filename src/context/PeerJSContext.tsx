import Peer, { DataConnection } from 'peerjs'
import React, { MutableRefObject, ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useToast } from './ToastContext'

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
    conn: DataConnection,
    pingMs: number
    lastSendPingTimestamp: number
}

type PeerJsClientMap = Record<string, PeerJsClient>
export type OnMessageCb = (message: SocketMessage) => void
export type OnPlayerDisconnectCb = (id: string) => void

const PING_MESSAGE_INTERVAL_MS = 3000
const PONG_MESSAGE_TIMEOUT = 3000

interface PeerJSContextData {
    initPeerSocket: () => void
    connectToHost: (id: string) => void
    sendMessageRef: MutableRefObject<(message: MESSAGES, data: any) => void>
    setOnMessageCb: (cb: OnMessageCb) => void
    setOnPlayerDisconnectCb: (cb: OnPlayerDisconnectCb) => void
    amIHost: () => boolean
    peerId: string,
    isAClientOrHost: () => boolean
    hostConnectionRef: MutableRefObject<DataConnection | undefined>,
    getPlayerPingMs: (id: string) => number
}

const PeerJSContext = createContext<PeerJSContextData | undefined>(undefined)

export const PeerJSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const peer = useRef<Peer>()
    const [peerId, setPeerId] = useState('')

    // clientConnectionsMap and hostConnection are related to UI: utilization of useState
    // Track latest value in stale closure so via reference : see https://github.com/facebook/react/issues/16975#issuecomment-537178823

    const [clientConnectionsMap, setClientConnectionsMap] = useState<PeerJsClientMap>({})
    const clientConnectionsMapRef = useRef(clientConnectionsMap)
    useEffect(() => {
        clientConnectionsMapRef.current = clientConnectionsMap
    }, [clientConnectionsMap])

    const [hostConnection, setHostConnection] = useState<DataConnection | undefined>(undefined)
    const hostConnectionRef = useRef(hostConnection)
    useEffect(() => {
        hostConnectionRef.current = hostConnection
    }, [hostConnection])

    const onMessageCbRef = useRef<OnMessageCb>(() => console.error('onMessageCb is not set'))
    const onPlayerDisconnectRef = useRef<OnPlayerDisconnectCb>(() => console.error('onPlayerDisconnectRef is not set'))

    const { showToast } = useToast()

    const setOnMessageCb = (cb: OnMessageCb) => onMessageCbRef.current = cb
    const setOnPlayerDisconnectCb = (cb: OnPlayerDisconnectCb) => onPlayerDisconnectRef.current = cb

    const pingPongTimeoutRef = useRef<Record<string, number>>({})

    const onClientDisconnection = useCallback((clientId: string) => {
        setClientConnectionsMap(prev => {
            const newMap = { ...prev }
            delete newMap[clientId]
            return newMap
        })
        onPlayerDisconnectRef.current(clientId)

        const clientPingPongTimeout = pingPongTimeoutRef.current[clientId]
        if (!clientPingPongTimeout) clearTimeout(clientPingPongTimeout)
        delete pingPongTimeoutRef.current[clientId]
        console.log(pingPongTimeoutRef.current);
    }, [])

    const getPlayerPingMs = (id: string) => clientConnectionsMap[id]?.pingMs

    const onHostDisconnection = useCallback(() => {
        setHostConnection(undefined)
        showToast('Disconnected to host')
    }, [showToast])

    const getClientPeerJsConnection = useCallback((clientId: string) => clientConnectionsMapRef.current[clientId], [])

    const setPingToClient = (clientId: string, ping: number) => {
        setClientConnectionsMap(prev => {
            const newMap = { ...prev }
            if (newMap[clientId]) newMap[clientId].pingMs = ping
            return newMap
        })
    }

    const setLastSendPingTimestampToClient = (clientId: string) => {
        setClientConnectionsMap(prev => {
            const newMap = { ...prev }
            if (newMap[clientId]) newMap[clientId].lastSendPingTimestamp = Date.now()
            return newMap
        })
    }


    const sendPing = useCallback((clientId: string, clientConnection?: DataConnection) => {
        const clientPeerJsConnection = getClientPeerJsConnection(clientId)
        const connection = clientPeerJsConnection?.conn ?? clientConnection // On the first PING, clientPeerJsConnection is not defined
        if (!connection) {
            console.error('No connection to send ping');
            return
        }
        // Expect a PONG message in less than 5 seconds
        // If not, client is disconnected
        pingPongTimeoutRef.current[clientId] = setTimeout(() => onClientDisconnection(clientId), PONG_MESSAGE_TIMEOUT)
        console.log('🏓 PING');
        setLastSendPingTimestampToClient(clientId)
        connection.send({ message: MESSAGES.PING, data: {} })
    }, [onClientDisconnection, getClientPeerJsConnection])


    const onData = useCallback(async (data: SocketMessage, fromId: string) => {
        clearTimeout(pingPongTimeoutRef.current[fromId])
        if (data.message === MESSAGES.PONG) {
            // Received by the host
            const clientPeerJsConnection = getClientPeerJsConnection(fromId)
            if (!clientPeerJsConnection) return
            if (clientPeerJsConnection.lastSendPingTimestamp) {
                setPingToClient(fromId, Date.now() - clientPeerJsConnection.lastSendPingTimestamp)
            }
            setTimeout(() => sendPing(fromId), PING_MESSAGE_INTERVAL_MS)
            return
        }

        if (data.message === MESSAGES.PING) {
            // Received by the client
            // Expect another PING message in PING_MESSAGE_INTERVAL_MS
            // If not, host is disconnected
            pingPongTimeoutRef.current[fromId] = setTimeout(() => onHostDisconnection(), 2 * PING_MESSAGE_INTERVAL_MS)
            if (!hostConnectionRef.current) {
                console.error('No hostConnection to send pong');
                return
            }
            console.log('🏓 PONG');
            hostConnectionRef.current.send({ message: MESSAGES.PONG, data: {} })
            return
        }
        onMessageCbRef.current(data)
    }, [sendPing, onHostDisconnection, getClientPeerJsConnection])

    const initPeerSocket = () => {
        const newPeer = new Peer()
        newPeer.on('open', id => {
            peer.current = newPeer
            setPeerId(id)
        })
        newPeer.on('close', () => console.log('peer close')) // TODO:
        newPeer.on('error', (data) => console.error('peer error', data)) // TODO:
        newPeer.on('disconnected', (d) => console.log('peer disconnected', d)) // TODO:
        newPeer.on('call', (d) => console.log('peer call', d)) // TODO:

        newPeer.on('connection', clientConn => {
            const clientId = clientConn.peer

            clientConn.on('close', () => {
                // Client disconnected
                console.log('clientConn close', clientId)
                onClientDisconnection(clientId)
            })
            clientConn.on('error', data => {
                if (!clientConnectionsMap[clientId]) return // Disconnected, expected to fail
                console.error('clientConn error', data, clientId)
                // TODO:
                // Can not send message (eg player shut down the tab)
            })
            clientConn.on('data', async (data) => {
                console.log('⬇️ from Client', data)
                onData(data as SocketMessage, clientId)
            })
            clientConn.on('open', () => {
                setClientConnectionsMap(prev => ({ ...prev, [clientId]: { conn: clientConn, pingMs: 0, lastSendPingTimestamp: 0 } }))
                clientConn.send({ message: MESSAGES.GET_PLAYER })
                sendPing(clientId, clientConn)
            })
        })
    }

    const connectToHost = (hostId: string) => {
        if (!peer.current) throw Error('Peer is not defined')
        if (hostConnectionRef.current) throw Error('hostConnection already set')
        const hostConn = peer.current.connect(hostId)

        hostConn.on('close', () => {
            // Lost connection with host
            console.log('hostConn close', hostId);
            onHostDisconnection()
        })
        hostConn.on('error', data => {
            console.error('on error', data, hostId) // TODO:
            // Can not send message (eg host shut down the tab)
        })
        hostConn.on('data', (data) => {
            console.log('⬇️ from Host', data)
            onData(data as SocketMessage, hostId)
        })
        hostConn.on('open', () => {
            setHostConnection(hostConn)
        })
    }

    const sendMessageRef = useRef((message: MESSAGES, data: any) => {
        const socketMessage: SocketMessage = { message, data }

        if (hostConnectionRef.current) {
            console.log('⬆️ to Host ', socketMessage);
            hostConnectionRef.current.send(socketMessage)
            return
        }
        Object.values(clientConnectionsMapRef.current).forEach(({ conn }) => {
            console.log(`⬆️ to Client ${conn.peer} `, socketMessage);
            conn.send(socketMessage)
        })
    })

    const amIHost = useCallback(() => hostConnection ? false : true, [hostConnection])

    const isAClientOrHost = () => {
        return hostConnection ? true : false || Object.keys(clientConnectionsMap).length > 0
    }

    const value: PeerJSContextData = {
        initPeerSocket,
        connectToHost,
        setOnMessageCb,
        setOnPlayerDisconnectCb,
        sendMessageRef,
        amIHost,
        peerId,
        isAClientOrHost,
        hostConnectionRef,
        getPlayerPingMs
    }

    return (
        <PeerJSContext.Provider value={value}>
            {children}
        </PeerJSContext.Provider>
    )
}

// Create a custom hook to easily access the context
export const usePeerJSContext = () => {
    const context = useContext(PeerJSContext)
    if (context === undefined) {
        throw new Error('usePeerJSContext must be used within a PeerJSProvider')
    }
    return context
}