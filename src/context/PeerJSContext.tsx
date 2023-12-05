import Peer, { DataConnection } from 'peerjs'
import React, { MutableRefObject, ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export enum MESSAGES {
    HELLO = 'HELLO',
    UPDATE_PLAYER = 'UPDATE_PLAYER',
    UPDATE_GAME = 'UPDATE_GAME',
    GET_PLAYER = 'GET_PLAYER',
    CHOSE_IMAGE = 'CHOSE_IMAGE',
    OK_NEXT_TEAM = 'OK_NEXT_TEAM',
    HINT_IMAGE = 'HINT_IMAGE',
}

export interface SocketMessage {
    message: MESSAGES,
    data: any
}


type DataConnectionMap = Record<string, DataConnection>
export type OnMessageCb = (message: SocketMessage) => void

interface PeerJSContextData {
    initPeerSocket: () => void
    connectToHost: (id: string) => void
    sendMessageRef: MutableRefObject<(message: MESSAGES, data: any) => void>
    setOnMessageCb: (cb: OnMessageCb) => void
    amIHost: () => boolean
    peerId: string,
    isAClientOrHost: () => boolean
    hostConnectionRef: MutableRefObject<DataConnection | undefined>
}

const PeerJSContext = createContext<PeerJSContextData | undefined>(undefined)

export const PeerJSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const peer = useRef<Peer>()
    const [peerId, setPeerId] = useState('')

    // clientConnectionsMap and hostConnection are related to UI: utilization of useState
    // Track latest value in stale closure so via reference : see https://github.com/facebook/react/issues/16975#issuecomment-537178823

    const [clientConnectionsMap, setClientConnectionsMap] = useState<DataConnectionMap>({})
    const clientConnectionsMapRef = useRef(clientConnectionsMap)
    useEffect(() => {
        clientConnectionsMapRef.current = clientConnectionsMap
    }, [clientConnectionsMap])

    const [hostConnection, setHostConnection] = useState<DataConnection | undefined>(undefined)
    const hostConnectionRef = useRef(hostConnection)
    useEffect(() => {
        hostConnectionRef.current = hostConnection
    }, [hostConnection])

    const onMessageCb = useRef<OnMessageCb>(() => {
        console.error('onMessageCb is not set')
    })

    const setOnMessageCb = (cb: OnMessageCb) => onMessageCb.current = cb

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
                // TODO: test
                setClientConnectionsMap(prev => {
                    const newMap = structuredClone(prev)
                    delete newMap[clientId]
                    return newMap
                })
            })
            clientConn.on('error', data => {
                console.error('clientConn error', data, clientId)
                // TODO:
                // Can not send message (eg player shut down the tab)
            })
            clientConn.on('data', (data) => {
                console.log('✉️ from Client', data)
                onMessageCb.current(data as SocketMessage)
            })
            clientConn.on('open', () => {
                setClientConnectionsMap(prev => ({ ...prev, [clientId]: clientConn }))
                clientConn.send({ message: MESSAGES.GET_PLAYER })
            })
        })
    }

    const connectToHost = (hostId: string) => {
        if (!peer.current) throw Error('Peer is not defined')
        if (hostConnectionRef.current) throw Error('hostConnection already set')
        const hostConn = peer.current.connect(hostId)

        hostConn.on('close', () => {
            console.log('on close', hostId) // TODO:
        })
        hostConn.on('error', data => {
            console.error('on error', data, hostId) // TODO:
            // Can not send message (eg host shut down the tab)
        })
        hostConn.on('data', (data) => {
            console.log('📧 from Host', data)
            onMessageCb.current(data as SocketMessage)
        })
        hostConn.on('open', () => {
            setHostConnection(hostConn)
        })
    }

    const sendMessageRef = useRef((message: MESSAGES, data: any) => {
        const socketMessage: SocketMessage = { message, data }

        if (hostConnectionRef.current) {
            console.log('📧 to Host ', socketMessage);
            hostConnectionRef.current.send(socketMessage)
            return
        }
        Object.values(clientConnectionsMapRef.current).forEach(conn => {
            console.log(`📤 to Client ${conn.peer} `, socketMessage);
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
        sendMessageRef,
        amIHost,
        peerId,
        isAClientOrHost,
        hostConnectionRef
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