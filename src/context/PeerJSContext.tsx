import React, { ReactNode, createContext, useContext, useRef, useState } from 'react'
import PeerJsWrapper, { MESSAGES, PeerJsClientMap, SocketMessage } from '../utils/peerjs.utils'
import { useToast } from './ToastContext'


export type OnMessageCb = (message: SocketMessage) => void
export type OnPlayerDisconnectCb = (id: string) => void


interface PeerJSContextData {
    initPeerSocket: () => void
    connectToHost: (id: string) => void
    sendMessage: (message: MESSAGES, data: any) => void
    setOnMessageCb: (cb: OnMessageCb) => void
    setOnPlayerDisconnectCb: (cb: OnPlayerDisconnectCb) => void
    amIHost: () => boolean
    setOnDisconnectHostCb: (cb: () => void) => void
    peerId: string,
    isAClientOrHost: () => boolean
    getPlayerPingMs: (id: string) => number
}

const PeerJSContext = createContext<PeerJSContextData | undefined>(undefined)

export const PeerJSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const [peerId, setPeerId] = useState('')
    const [isHostConnected, setIsHostConnected] = useState(false)

    const [clientConnectionsMap, setClientConnectionsMap] = useState<PeerJsClientMap>({})

    const onMessageCbRef = useRef<OnMessageCb>(() => console.error('onMessageCb is not set'))
    const setOnMessageCb = (cb: OnMessageCb) => onMessageCbRef.current = cb

    const onPlayerDisconnectRef = useRef<OnPlayerDisconnectCb>(() => console.error('onPlayerDisconnectRef is not set'))
    const setOnPlayerDisconnectCb = (cb: OnPlayerDisconnectCb) => onPlayerDisconnectRef.current = cb

    const onDisconnectHostRef = useRef(() => console.error('onDisconnectHostRef is not set'))
    const setOnDisconnectHostCb = (cb: () => void) => onDisconnectHostRef.current = cb

    const { showToast } = useToast()

    const getPlayerPingMs = (id: string) => clientConnectionsMap[id]?.pingMs

    const initPeerSocket = async () => {
        PeerJsWrapper.on('peerDisconnect', () => setPeerId(''))
        PeerJsWrapper.on('hostConnect', () => {
            setIsHostConnected(true)
            showToast('👋 Connected to the host')
        })
        PeerJsWrapper.on('hostDisconnect', () => {
            setIsHostConnected(false)
            onDisconnectHostRef.current()
            showToast('😢 Disconnected from the host')
        })
        PeerJsWrapper.on('clientUpdates', clients => setClientConnectionsMap(clients))
        PeerJsWrapper.on('clientDisconnect', (clientId, clients) => {
            onPlayerDisconnectRef.current(clientId)
            setClientConnectionsMap(clients)
        })
        PeerJsWrapper.on('message', message => onMessageCbRef.current(message))
        setPeerId(await PeerJsWrapper.init())
    }

    const amIHost = () => !isHostConnected
    const isAClientOrHost = () => isHostConnected || Object.keys(clientConnectionsMap).length > 0

    const value: PeerJSContextData = {
        initPeerSocket,
        connectToHost: hostId => PeerJsWrapper.connectToHost(hostId),
        sendMessage: (message: MESSAGES, data: any) => PeerJsWrapper.sendMessage(message, data),
        setOnMessageCb,
        setOnPlayerDisconnectCb,
        amIHost,
        setOnDisconnectHostCb,
        peerId,
        isAClientOrHost,
        getPlayerPingMs,
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