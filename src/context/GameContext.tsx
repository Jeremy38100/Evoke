import React, { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Game, ImageCard, Player, TeamId } from '../models/model'
import { ChoseImageOpts, choseCardFromGame, getDefaultGameData, hintCardFromGame, okNextTeamFromGame, setGameInWaitingBeforeStart, startGame, updatePlayerFromGame } from '../utils/gameUtils'
import { MESSAGES, OnMessageCb, usePeerJSContext } from './PeerJSContext'

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

    const { peerId, sendMessageRef, setOnMessageCb, connectToHost, amIHost } = usePeerJSContext()
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
        sendMessageRef.current(MESSAGES.UPDATE_GAME, game)
    }, [game, amIHost, sendMessageRef])

    const getMyPlayer = useCallback(() => {
        return Object.values(game.players).find(p => p.id === peerId) // TODO: use Record instead of array
    }, [game, peerId])

    const updateGame = useCallback((cb: UpdateGameFromPreviousCb) => {
        if (!amIHost()) return
        setGame(prev => cb(structuredClone(prev)))
    }, [amIHost])

    const start = useCallback(() => {
        updateGame(newGame => startGame(newGame))
    }, [updateGame])

    const setInWaitingBeforeStart = useCallback(() => {
        updateGame(newGame => setGameInWaitingBeforeStart(newGame))
    }, [updateGame])

    // TODO: use this
    // const removePlayer = useCallback((id: string) => {
    //     if (!amIHost()) return
    //     updateGame(newGame => removePlayerFromGame(newGame, id))
    // }, [amIHost, updateGame])

    const updatePlayer = useCallback((player: Player) => {
        if (!amIHost()) return sendMessageRef.current(MESSAGES.UPDATE_PLAYER, player)
        updateGame(newGame => updatePlayerFromGame(newGame, player))
    }, [amIHost, sendMessageRef, updateGame])

    const hintCard = useCallback((image: ImageCard) => {
        if (!amIHost()) return sendMessageRef.current(MESSAGES.HINT_IMAGE, { image, player: getMyPlayer() })
        updateGame(newGame => hintCardFromGame(newGame, image.imageId))
    }, [amIHost, sendMessageRef, updateGame, getMyPlayer])

    const OkNextTeam = useCallback(() => {
        if (!amIHost()) return sendMessageRef.current(MESSAGES.OK_NEXT_TEAM, {})
        updateGame(newGame => okNextTeamFromGame(newGame))
    }, [amIHost, sendMessageRef, updateGame])

    const choseCard = useCallback(({ imageId, player }: ChoseImageOpts) => {
        if (!amIHost()) return sendMessageRef.current(MESSAGES.CHOSE_IMAGE, { imageId, player })
        updateGame(newGame => choseCardFromGame(newGame, { imageId, player }))
    }, [amIHost, sendMessageRef, updateGame])

    const setMyPlayerTeam = (teamId: TeamId, isGameMaster: boolean) => {
        const myPlayer = getMyPlayer()
        if (!myPlayer) throw new Error('I do not have my player in game')
        myPlayer.teamId = teamId
        myPlayer.isGameMaster = isGameMaster
        if (!amIHost()) return sendMessageRef.current(MESSAGES.UPDATE_PLAYER, myPlayer)
        updateGame(newGame => updatePlayerFromGame(newGame, myPlayer))
    }

    const joinRoom = (id: string) => {
        connectToHost(id)
    }

    useEffect(() => {
        if (!peerId || !myPlayerName) return
        const myPlayer = Object.values(gameRef.current.players).find(p => p.id === peerId) ?? {
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

    // ------- DEBUG -------
    useEffect(() => { console.log('🔄 amIHost') }, [amIHost])
    useEffect(() => { console.log('🔄 sendMessageRef') }, [sendMessageRef])
    useEffect(() => { console.log('🔄 game') }, [game])
    useEffect(() => { console.log('🔄 myPlayerName') }, [myPlayerName])
    useEffect(() => { console.log('🔄 peerId') }, [peerId])
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