import React, { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Game, ImageCard, Player, TeamId } from '../models/model'
import { ChoseImageOpts, choseCardFromGame, getDefaultGameData, hintCardFromGame, okNextTeamFromGame, setGameInWaitingBeforeStart, startGame, updatePlayerFromGame } from '../utils/game.utils'
import { MESSAGES } from '../utils/peerjs.utils'
import { OnMessageCb, usePeerJSContext } from './PeerJSContext'
import { useToast } from './ToastContext'

interface GameContextData {
    game: Game
    getMyPlayer: () => Player | undefined
    hintCard: (image: ImageCard) => void
    choseCard: (opts: ChoseImageOpts) => void,
    OkNextTeam: () => void,
    setMyPlayerName: (name: string) => void,
    setMyPlayerTeam: (team: TeamId, isGameMaster: boolean) => void,
    start: () => void,
    setInWaitingBeforeStart: () => void,
    joinRoom: (id: string) => void
}

type UpdateGameFromPreviousCb = (previousGame: Game) => Game

const GameContext = createContext<GameContextData | undefined>(undefined)

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const { showToast } = useToast()
    const { peerId, sendMessage, setOnMessageCb, connectToHost, amIHost, setOnPlayerDisconnectCb, setOnDisconnectHostCb } = usePeerJSContext()
    const [myPlayerName, setMyPlayerName] = useState('')

    /*
        Related to UI utilization of useState
        Track latest value in stale closure so via reference : see https://github.com/facebook/react/issues/16975#issuecomment-537178823

        Important note Socket wrapper around game that's why you never have to
        use setGame (but updateGame) elsewhere than:
            - set gameId
            - client receive instruction from server to update the game
            - you are the host in the updateGame wrapper
    */
    const [game, setGame] = useState<Game>(getDefaultGameData())
    const gameRef = useRef(game)
    useEffect(() => {
        gameRef.current = game
    }, [game])

    useEffect(() => {
        setGame(prev => ({ ...prev, gameId: peerId }))
    }, [peerId])

    useEffect(() => {
        if (!amIHost()) return
        sendMessage(MESSAGES.UPDATE_GAME, game)
    }, [game, amIHost, sendMessage])

    const getMyPlayer = useCallback(() => {
        return game.players[peerId]
    }, [game, peerId])

    const updateGame = useCallback((cb: UpdateGameFromPreviousCb) => {
        if (!amIHost()) return
        setGame(prev => cb(structuredClone(prev)))
    }, [amIHost])

    const start = useCallback(() => {
        updateGame(currentGame => startGame(currentGame))
    }, [updateGame])

    const setInWaitingBeforeStart = useCallback(() => {
        updateGame(currentGame => setGameInWaitingBeforeStart(currentGame))
    }, [updateGame])



    const updatePlayer = useCallback((player: Player) => {
        if (!amIHost()) return sendMessage(MESSAGES.UPDATE_PLAYER, player)
        updateGame(currentGame => updatePlayerFromGame(currentGame, player))
    }, [amIHost, sendMessage, updateGame])

    const hintCard = useCallback((image: ImageCard) => {
        if (!amIHost()) return sendMessage(MESSAGES.HINT_IMAGE, { image, player: getMyPlayer() })
        updateGame(currentGame => hintCardFromGame(currentGame, image.imageId))
    }, [amIHost, sendMessage, updateGame, getMyPlayer])

    const OkNextTeam = useCallback(() => {
        if (!amIHost()) return sendMessage(MESSAGES.OK_NEXT_TEAM, {})
        updateGame(currentGame => okNextTeamFromGame(currentGame))
    }, [amIHost, sendMessage, updateGame])

    const choseCard = useCallback(({ imageId, player }: ChoseImageOpts) => {
        if (!amIHost()) return sendMessage(MESSAGES.CHOSE_IMAGE, { imageId, player })
        updateGame(currentGame => choseCardFromGame(currentGame, { imageId, player }))
    }, [amIHost, sendMessage, updateGame])

    const deletePlayer = useCallback((id: string) => {
        const player = gameRef.current.players[id]
        if (!player) return
        showToast(`💔 ${player.name} left`)

        updateGame(currentGame => {
            const newGame = structuredClone(currentGame)
            delete newGame.players[id]
            return newGame
        })
    }, [showToast, updateGame])

    const setMyPlayerTeam = (teamId: TeamId, isGameMaster: boolean) => {
        const myPlayer = getMyPlayer()
        if (!myPlayer) throw new Error('I do not have my player in game')
        myPlayer.teamId = teamId
        myPlayer.isGameMaster = isGameMaster
        if (!amIHost()) return sendMessage(MESSAGES.UPDATE_PLAYER, myPlayer)
        updateGame(currentGame => updatePlayerFromGame(currentGame, myPlayer))
    }

    const joinRoom = (id: string) => {
        connectToHost(id)
    }

    useEffect(() => {
        if (!peerId || !myPlayerName) return
        const myPlayer = gameRef.current.players[peerId] ?? {
            teamId: '',
            isGameMaster: false,
            id: peerId,
            name: myPlayerName,
        }

        updatePlayer({ ...myPlayer, name: myPlayerName, id: peerId })
    }, [myPlayerName, peerId, updatePlayer])

    useEffect(() => {
        const onMessageCb: OnMessageCb = ({ message, data }) => {
            // Host-received messages
            if (message === MESSAGES.UPDATE_PLAYER) updatePlayer(data)
            else if (message === MESSAGES.HINT_IMAGE) hintCard(data)
            else if (message === MESSAGES.CHOSE_IMAGE) choseCard(data)
            else if (message === MESSAGES.OK_NEXT_TEAM) OkNextTeam()

            // Client-received messages
            else if (message === MESSAGES.UPDATE_GAME) setGame(data)
            else if (message === MESSAGES.GET_PLAYER) updatePlayer({
                id: peerId,
                name: myPlayerName,
                isGameMaster: false,
                teamId: ''
            })

            else console.error('Unknown message: ', message, data); // TODO: shall we just ignore this
        }
        setOnMessageCb(onMessageCb)
    }, [setGame, updatePlayer, hintCard, choseCard, OkNextTeam, setOnMessageCb, peerId, myPlayerName])

    useEffect(() => {
        setOnPlayerDisconnectCb(deletePlayer)
    }, [deletePlayer, setOnPlayerDisconnectCb])

    useEffect(() => {
        setOnDisconnectHostCb(() => {
            const newGame = getDefaultGameData()
            newGame.gameId = peerId
            newGame.players[peerId] = {
                teamId: '',
                isGameMaster: false,
                id: peerId,
                name: myPlayerName,
            }
            setGame(newGame)
        })
    }, [myPlayerName, peerId, setOnDisconnectHostCb])

    // ------- DEBUG -------
    useEffect(() => { console.log('🔄 amIHost') }, [amIHost])
    useEffect(() => { console.log('🔄 sendMessage') }, [sendMessage])
    useEffect(() => { console.log('🔄 game', game) }, [game])
    useEffect(() => { console.log('🔄 myPlayerName') }, [myPlayerName])
    useEffect(() => { console.log('🔄 peerId', peerId) }, [peerId])
    // ---------------------

    const value: GameContextData = {
        game,
        getMyPlayer,
        hintCard,
        choseCard,
        OkNextTeam,
        setMyPlayerName,
        setMyPlayerTeam,
        start,
        setInWaitingBeforeStart,
        joinRoom
    }

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    )
}


export const useGameContext = () => {
    const context = useContext(GameContext)
    if (context === undefined) {
        throw new Error('useGameContext must be used within a GameProvider')
    }
    return context
}