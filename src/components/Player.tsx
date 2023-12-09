import { useGameContext } from '../context/GameContext'
import { usePeerJSContext } from '../context/PeerJSContext'

export interface PlayerCompProps {
    name: string
    id: string
    teamId: string
}

function Player({ name, id, teamId }: PlayerCompProps) {

    const { game } = useGameContext()
    const { getPlayerPingMs } = usePeerJSContext()
    const isHost = id === game.gameId

    const pingMs = getPlayerPingMs(id) // only the host can get the ping of other players

    return (
        <p className={`playerName ${teamId}`} >
            {isHost && '🏠'} <span className={`${teamId}`} id={`player-${id}`}>{name}</span> {pingMs && <span style={{ opacity: 0.2 }}>{pingMs}ms</span>}
        </p>
    )
}

export default Player