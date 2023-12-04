import { Game, GameStatus, Player, TeamId } from "./model"

export interface TeamPlayersProps {
    myPlayer: Player
    gameData: Game
    teamId: TeamId
    joinTeam: (teamId: TeamId, isGameMaster: boolean) => void
}

export const TeamPlayers = ({ myPlayer, gameData, teamId, joinTeam }: TeamPlayersProps) => {
    const getPlayersInTeam = () => Object.values(gameData.players).filter(p => p.teamId === teamId)
    const getGameMasters = () => getPlayersInTeam().filter(({ isGameMaster }) => isGameMaster)
    const getPlayers = () => getPlayersInTeam().filter(({ isGameMaster }) => !isGameMaster)

    const canSelectTeam = gameData.gameStatus == GameStatus.WAITING_TO_START || true
    const amIInThisTeam = myPlayer.teamId == teamId
    const amIGameMasterInThisTeam = amIInThisTeam && myPlayer.isGameMaster
    const amIPLayerInThisTeam = amIInThisTeam && !myPlayer.isGameMaster

    const joinAsGameMaster = (isGameMaster: boolean) => joinTeam(teamId, isGameMaster)

    return (
        <div>
            <p>{teamId}</p>
            <div>
                <p>👑 Game masters:</p>
                {getGameMasters().map(({ id, name }) => (<p key={id}>{name}</p>))}
                {canSelectTeam && !amIGameMasterInThisTeam &&
                    <button onClick={() => joinAsGameMaster(true)}>Join</button>
                }
            </div>
            <div>
                <p>🧠 Players:</p>
                {getPlayers().map(({ id, name }) => (<p key={id}>{name}</p>))}
                {canSelectTeam && !amIPLayerInThisTeam &&
                    <button onClick={() => joinAsGameMaster(false)}>Join</button>
                }
            </div>
        </div >
    )
}

export const NoTeamPlayers = ({ gameData }: TeamPlayersProps) => {
    const getPlayersWithoutTeam = () => Object.values(gameData.players).filter(({ teamId }) => !teamId)
    return (
        <div>
            <p>🧟‍♂️ No Teams</p>
            {getPlayersWithoutTeam().map(({ id, name }) => (<p key={id}>{name}</p>))}
        </div>
    )
}
