import { useGameContext } from "../context/GameContext"
import { GameStatus, TeamId } from "../models/model"
import Player from "./Player"

export interface TeamPlayersProps {
    teamId: TeamId
}

export const TeamPlayers = ({ teamId }: TeamPlayersProps) => {
    const { game, getMyPlayer, setMyPlayerTeam } = useGameContext()

    const myPlayer = getMyPlayer()!

    const getPlayersInTeam = () => Object.values(game.players).filter(p => p.teamId === teamId)
    const getGameMasters = () => getPlayersInTeam().filter(({ isGameMaster }) => isGameMaster)
    const getPlayers = () => getPlayersInTeam().filter(({ isGameMaster }) => !isGameMaster)

    const canSelectTeam = game.gameStatus === GameStatus.WAITING_TO_START || true
    const amIInThisTeam = myPlayer.teamId === teamId
    const amIGameMasterInThisTeam = amIInThisTeam && myPlayer.isGameMaster
    const amIPLayerInThisTeam = amIInThisTeam && !myPlayer.isGameMaster

    const joinAsGameMaster = (isGameMaster: boolean) => setMyPlayerTeam(teamId, isGameMaster)

    return (
        <div>
            <p>{teamId}</p>
            <div>
                <p>👑 Game masters:</p>
                {getGameMasters().map(({ id, name }) => (<Player key={id} {...{ id, name, teamId }} />))}
                {canSelectTeam && !amIGameMasterInThisTeam &&
                    <button onClick={() => joinAsGameMaster(true)}>Join</button>
                }
            </div>
            <div>
                <p>🧠 Players:</p>
                {getPlayers().map(({ id, name }) => (<Player key={id} {...{ id, name, teamId }} />))}
                {canSelectTeam && !amIPLayerInThisTeam &&
                    <button onClick={() => joinAsGameMaster(false)}>Join</button>
                }
            </div>
        </div >
    )
}

export const NoTeamPlayers = () => {
    const { game } = useGameContext()
    const getPlayersWithoutTeam = () => Object.values(game.players).filter(({ teamId }) => !teamId)
    return (
        <div>
            <p>🧟‍♂️ No Teams</p>
            {getPlayersWithoutTeam().map(({ id, name }) => (<Player key={id} {...{ id, name, teamId: 'teamNone' }} />))}
        </div>
    )
}
