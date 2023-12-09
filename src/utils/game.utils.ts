import { Game, GameStatus, Player, TeamId } from "../models/model"
import { getImages } from "./images.utils"

/**
 * Returns the default game data.
 *
 * @returns {Game} The default game data.
 */
export const getDefaultGameData = (): Game => ({
  gameId: '',
  teams: [],
  players: {},
  gameStatus: GameStatus.WAITING_TO_START,
  teamPlaying: '',
  images: [],
  winner: ''
})

export const getOtherTeam = (team: TeamId): TeamId => {
  if (team === 'teamBlue') return 'teamRed'
  return 'teamBlue'
}

export const startGame = (game: Game): Game => ({
  ...game,
  images: getImages({
    nbBlue: 7,
    nbRed: 6,
    nbNeutral: 2,
    nbDead: 1

  }), // TODO: adapt to the game options
  teamPlaying: 'teamBlue',
  teams: [
    { teamId: 'teamBlue', nbTryLeft: 5 },
    { teamId: 'teamRed', nbTryLeft: 6 },
  ],
  gameStatus: GameStatus.RUNNING,
})

export const setGameInWaitingBeforeStart = (game: Game): Game => ({
  ...game,
  teams: [],
  gameStatus: GameStatus.WAITING_TO_START,
  teamPlaying: '',
  images: [],
  winner: '',
})

export const endGame = (game: Game, teamWinnerId: TeamId): Game => {
  game.gameStatus = GameStatus.ENDED
  game.images.forEach(image => image.isHint = false)
  game.winner = teamWinnerId
  return game
}

export const getRemainingNbImagesForTeam = (game: Game, teamId: TeamId): number => {
  return game.images.filter(i => i.imageTeam === teamId && i.flippedByTeam === '').length
}

export const removePlayerFromGame = (game: Game, playerId: string): Game => {
  if (!game.players[playerId]) {
    console.error(game.players[playerId], 'PLayer does not exists in game, delete useless');
  }
  delete game.players[playerId]
  return game
}

export const updatePlayerFromGame = (game: Game, player: Player): Game => {
  game.players[player.id] = player
  return game
}

export const hintCardFromGame = (game: Game, imageId: string): Game => {
  const imageFromGame = game.images.find(i => i.imageId === imageId)
  if (!imageFromGame)
    console.error('can not find image', imageId)
  else
    imageFromGame.isHint = !imageFromGame.isHint
  return game
}

export const okNextTeamFromGame = (game: Game): Game => {
  game.images.forEach(image => image.isHint = false)
  game.teamPlaying = getOtherTeam(game.teamPlaying)
  return game
}

export interface ChoseImageOpts {
  imageId: string,
  player: Player
}

export const choseCardFromGame = (game: Game, { imageId, player }: ChoseImageOpts) => {
  const playerTeamId = player.teamId
  const otherTeamId = getOtherTeam(playerTeamId)

  const playerTeam = game.teams.find(t => t.teamId === playerTeamId)
  if (!playerTeam) throw Error('Can not playerTeam ' + playerTeamId)

  const imageFromGame = game.images.find(i => i.imageId === imageId) // TODO: use Record instead of Array
  if (!imageFromGame) throw Error('Can not find image: ' + imageId)

  imageFromGame.flippedByTeam = playerTeamId
  imageFromGame.isHint = false
  const imageTeam = imageFromGame!.imageTeam

  if (imageTeam === 'dead') return endGame(game, otherTeamId)

  playerTeam.nbTryLeft -= 1
  if (imageTeam !== playerTeamId) {
    game.images.forEach(image => image.isHint = false)
    game.teamPlaying = otherTeamId
  }

  if (!getRemainingNbImagesForTeam(game, playerTeamId)) return endGame(game, playerTeamId)
  if (!getRemainingNbImagesForTeam(game, otherTeamId)) return endGame(game, otherTeamId)
  return game
}
