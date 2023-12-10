import { useGameContext } from '../context/GameContext'

export interface PlayerCompProps {
    name: string
    id: string
    teamId: string
}

function Player({ name, id, teamId }: PlayerCompProps) {

    const { gameId, clientPingMsMap } = useGameContext()
    const isHost = id === gameId

    const pingMs = clientPingMsMap[id] // only the host can get the ping of other players

    return (
        <p className={`playerName ${teamId}`} >
            {isHost && '🏠'} <span className={`${teamId}`} id={`player-${id}`}>{name}</span> {pingMs && <span style={{ opacity: 0.2 }}>{pingMs}ms</span>}
        </p>
    )
}

export default Player