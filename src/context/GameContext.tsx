import { eq } from "lodash"
import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Game, Player, Team, TeamId } from '../models/model'
import { disableAllImagesHint, getImage, getOtherTeam, getRemainingNbImagesForTeam } from '../utils/game.utils'
import { getImages } from '../utils/images.utils'
import PeerJsWrapper, { MESSAGES, PeerJsClientMap } from '../utils/peerjs.utils'
import { useToast } from './ToastContext'

interface ImageActionOpts {
    imageId: string,
    player: Player
}
interface GameContextData {
    // PeerJS Status
    peerId: string,
    clientPingMsMap: Record<string, number>

    // Game status
    game: Game,
    myPlayer: Player
    gameId: string,
    amIHost: () => boolean
    isAClientOrHost: () => boolean

    // myPlayerActions
    hintCard: (opts: ImageActionOpts) => void
    choseCard: (opts: ImageActionOpts) => void,
    nextTeamToPlay: () => void,
    setMyPlayerName: (name: string) => void,
    setMyPlayerTeam: (team: TeamId, isGameMaster: boolean) => void,
    start: () => void,
    setInWaitingBeforeStart: () => void,
    joinRoom: (id: string) => void,
}

const getDefaultPlayer = (peerId: string): Player => {
    return {
        id: peerId,
        name: '',
        teamId: '',
        isGameMaster: false,
    }
}

const GameContext = createContext<GameContextData | undefined>(undefined)

/**
 * Sends a message using PeerJSWrapper
 *
 * @function
 * @param {MESSAGES} message - The type of message to send.
 * @param {any} data - The data to send along with the message.
 */
const sendMessage = (message: MESSAGES, data: any) => {
    PeerJsWrapper.sendMessage(message, data)
}

/**
 * Creates a default team record with initial values.
 *
 * @function
 * @returns {Record<TeamId, Team>} A record containing default team data.
 */
const defaultTeamRecord = (): Record<TeamId, Team> => ({
    '': { nbTryLeft: 0, teamId: "" },
    'teamBlue': { nbTryLeft: 0, teamId: "teamBlue" },
    'teamRed': { nbTryLeft: 0, teamId: "teamRed" },
})

/**
 * Creates a default game state with initial values.
 *
 * @function
 * @returns {Game} A game object with default values.
 */
const defaultGame = (): Game => ({
    gameStatus: 'waiting',
    teams: defaultTeamRecord(),
    images: {},
    players: {},
    teamPlaying: '',
    winner: ''
})

/**
 * React component for managing the game state and real-time communication using PeerJS.
 *
 * @component
 */
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const { showToast } = useToast()

    // Peer
    const [peerId, setPeerId] = useState('')
    const [hostId, setHostId] = useState('')
    const [clientConnectionsMap, setClientConnectionsMap] = useState<PeerJsClientMap>({})
    const clientPingMsMap = useMemo(() => {
        const pingPerClient: Record<string, number> = {}
        Object.keys(clientConnectionsMap).forEach(id => {
            pingPerClient[id] = clientConnectionsMap[id].pingMs
        })
        return pingPerClient
    }, [clientConnectionsMap])
    const amIHost = () => !hostId
    const isAClientOrHost = () => hostId ? true : false || Object.keys(clientConnectionsMap).length > 0

    // Game
    const gameId = hostId ? hostId : peerId
    const [game, setGame] = useState<Game>(defaultGame)

    // My Player
    const [myPlayer, setMyPlayer] = useState<Player>(getDefaultPlayer(peerId));
    const myPlayerRef = useRef<Player>(myPlayer)
    useEffect(() => { myPlayerRef.current = myPlayer }, [myPlayer])

    /**
     * Start a new game with initial settings:
     * - Set the number of cards on the game
     * - Set the number of tries for each team
     * - Start with teamBlue
     */
    const start = (): void => {
        setGame(game => ({
            ...game,
            images: getImages({
                nbBlue: 7,
                nbRed: 6,
                nbNeutral: 2,
                nbDead: 1
            }),
            teamPlaying: 'teamBlue',
            teams: {
                ...game.teams,
                teamBlue: { teamId: 'teamBlue', nbTryLeft: 5 },
                teamRed: { teamId: 'teamRed', nbTryLeft: 6 },
            },
            gameStatus: 'playing'
        }))
    }

    /**
     * Sets the game in waiting mode, before starting a new game.
     * @returns {void}
     */
    const setInWaitingBeforeStart = (): void => {
        setGame(game => ({
            ...game,
            gameStatus: 'waiting',
            teams: defaultTeamRecord(),
            images: {},
            winner: ''
        }))
    }

    /**
     * Update a player (eg, Pseudo update)
     * @param player The player object to update.
     * @returns {void}
     */
    const updatePlayer = useCallback((player: Player): void => {
        if (hostId) return sendMessage(MESSAGES.UPDATE_PLAYER, player)
        setGame(game => ({ ...game, players: { ...game.players, [player.id]: player } }))
    }, [hostId])

    // Hint a card so players can ping cards to team members
    /**
     * Provides a hint for a specific image in the game.
     *
     * @param {ImageActionOpts} options - The options for the image action, including the imageId and player.
     * @returns {void}
     */
    const hintCard = useCallback(({ imageId, player }: ImageActionOpts): void => {
        if (hostId) return sendMessage(MESSAGES.HINT_IMAGE, { imageId, player })
        setGame(game => {
            const newGame = { ...game }
            newGame.images[imageId].isHint = !newGame.images[imageId].isHint
            return newGame
        })
    }, [hostId])

    /**
     * Sets the next team to play in the game.
     * @returns {void}
     */
    const nextTeamToPlay = useCallback((): void => {
        if (hostId) return sendMessage(MESSAGES.OK_NEXT_TEAM, {})
        setGame(game => disableAllImagesHint({
            ...game,
            teamPlaying: getOtherTeam(game.teamPlaying)
        }))
    }, [hostId])

    /**
     * Handles the action of choosing a card.
     *
     *  - Decrease the number of tries for the player's team.
     *  - Check for end-game case :
     *      - dead card flipped
     *      - all cards of the player's team have been flipped
     *      - all cards of the opposing team have been flipped
     *
     * @param {ImageActionOpts} options - The options for the image action, including the imageId and player.
     * @returns {void}
     */
    const choseCard = useCallback(({ imageId, player }: ImageActionOpts): void => {
        if (hostId) return sendMessage(MESSAGES.CHOSE_IMAGE, { imageId, player })

        const endGame = (teamIdWinner: TeamId) => {
            setGame(game => disableAllImagesHint({
                ...game,
                gameStatus: 'finished',
                winner: teamIdWinner
            }))
        }

        const images = { ...game.images }
        const teams = { ...game.teams }

        const playerTeamId: TeamId = player.teamId
        const otherTeamId: TeamId = getOtherTeam(playerTeamId)
        const playerTeam = teams[playerTeamId]
        const image = getImage(images, imageId)

        image.flippedByTeam = playerTeamId
        image.isHint = false
        setGame(game => ({ ...game, images }))

        playerTeam.nbTryLeft -= 1 // Player flipped a card, decrease the number of tries for his team
        setGame(game => ({ ...game, teams }))

        const imageTeam = image!.imageTeam
        if (imageTeam !== playerTeamId) nextTeamToPlay()

        // Losing cases, end the game
        if (imageTeam === 'dead') return endGame(otherTeamId) // Player flipped the dead card
        if (!getRemainingNbImagesForTeam(images, playerTeamId))
            return endGame(playerTeamId) // All cards of the playerTeam have been flipped
        if (!getRemainingNbImagesForTeam(images, otherTeamId))
            return endGame(otherTeamId) // All cards of the playerTeam have been flipped

    }, [game, hostId, nextTeamToPlay])


    /**
     * Sets the team and game master status for the current player.
     *
     * @param teamId - The ID of the team to assign to the player.
     * @param isGameMaster - A boolean indicating whether the player is the game master.
     * @throws {Error} - If the current player is not in the game.
     */
    const setMyPlayerTeam = (teamId: TeamId, isGameMaster: boolean): void => {
        if (!myPlayer) throw new Error('I do not have my player in game')
        myPlayer.teamId = teamId
        myPlayer.isGameMaster = isGameMaster
        if (!amIHost()) return sendMessage(MESSAGES.UPDATE_PLAYER, myPlayer)
        setGame(game => ({ ...game, players: { ...game.players, [peerId]: myPlayer } }))
    }

    /**
     * Connects to the host with the specified ID.
     *
     * @param id - The ID of the host to connect to.
     * @returns {void}
     */
    const joinRoom = (id: string): void => {
        PeerJsWrapper.connectToHost(id)
    }

    /**
     * Sets the name of the player.
     *
     * @param name - The new name for the player.
     * @returns {void}
     */
    const setMyPlayerName = (name: string): void => {
        updatePlayer({ ...myPlayer, id: peerId, name })
    }

    // Hooks

    /**
     * Initializes the peer connection.
     * Executed once on mount
     */
    useEffect(() => {
        const init = async () => {
            setPeerId(await PeerJsWrapper.init())
        }
        init()
    }, [])

    /**
     * Dispatch game updates to clients
     */
    useEffect(() => {
        if (hostId) return
        sendMessage(MESSAGES.UPDATE_GAME, game)
    }, [game, hostId])

    /**
     * Updates the player when the game.players array is updated
     */
    useEffect(() => {
        const myPlayerFromPlayersArr = game.players[peerId]
        if (eq(myPlayerFromPlayersArr, myPlayer)) return
        setMyPlayer(myPlayerFromPlayersArr)
    }, [peerId, myPlayer, game])


    /**
     * This hook manages various event listeners and updates related to the game and PeerJS communication.
     * It handles actions such as handling player disconnects, managing host connections, receiving and processing messages,
     * and cleaning up event listeners when the component unmounts.
     *
     * @function
     *
     * @returns {Function} A cleanup function to remove event listeners when the component unmounts.
     */
    useEffect(() => {

        // Return myPlayer in a new game context
        const myPlayerInRawGame: Player = {
            ...myPlayerRef.current,
            teamId: '',
            isGameMaster: false,
        }

        /**
         * Handler for when the current player disconnects from the host.
         * Resets the game state and all players except myPlayer
         */
        const onDisconnectFromHost = () => {
            setGame({
                ...defaultGame(),
                players: { [peerId]: myPlayerInRawGame },
            })
        }

        /**
          * Handler for when a client disconnects from the game.
          * Displays a notification, removes the player from the game, and updates the game state.
          *
          * @param { string } id - The ID of the disconnected client.
          */
        const onDisconnectClient = (id: string) => {
            const player = game.players[id]
            if (!player) return
            showToast(`💔 ${player.name} left`)
            setGame(game => {
                const newGame = { ...game }
                delete newGame.players[id]
                return newGame
            })
        }

        // Set up event listeners for various PeerJS events

        PeerJsWrapper.on('peerDisconnect', () => {
            setPeerId('')
        })
        PeerJsWrapper.on('hostConnect', id => {
            setHostId(id)
            showToast('👋 Connected to the host')
        })
        PeerJsWrapper.on('hostDisconnect', () => {
            setHostId('')
            onDisconnectFromHost()
            showToast('😢 Disconnected from the host')
        })
        PeerJsWrapper.on('clientUpdates', clients => {
            setClientConnectionsMap({ ...clients })
        })
        PeerJsWrapper.on('clientDisconnect', (clientId, clients) => {
            onDisconnectClient(clientId)
            setClientConnectionsMap(clients)
        })

        // Handle incoming messages
        PeerJsWrapper.on('message', ({ message, data }) => {

            // Host-received messages
            if (message === MESSAGES.UPDATE_PLAYER) return updatePlayer(data)
            if (message === MESSAGES.HINT_IMAGE) return hintCard(data)
            if (message === MESSAGES.CHOSE_IMAGE) return choseCard(data)
            if (message === MESSAGES.OK_NEXT_TEAM) return nextTeamToPlay()

            // Client-received messages
            if (message === MESSAGES.UPDATE_GAME) {
                setGame(data)
                return
            }
            if (message === MESSAGES.GET_PLAYER) return updatePlayer(myPlayerInRawGame)

            console.error('Unknown message: ', message, data);
        })

        /**
         * Cleanup function for removing event listeners when the component unmounts
         */
        return () => {
            PeerJsWrapper.off('peerDisconnect')
            PeerJsWrapper.off('hostConnect')
            PeerJsWrapper.off('hostDisconnect')
            PeerJsWrapper.off('clientUpdates')
            PeerJsWrapper.off('clientDisconnect')
            PeerJsWrapper.off('message')
        }
    }, [choseCard, game, hintCard, nextTeamToPlay, peerId, showToast, updatePlayer])

    const value: GameContextData = {
        peerId,
        myPlayer,
        game,
        gameId,
        clientPingMsMap,
        hintCard,
        choseCard,
        nextTeamToPlay,
        setMyPlayerName,
        setMyPlayerTeam,
        start,
        setInWaitingBeforeStart,
        joinRoom,
        amIHost,
        isAClientOrHost,
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