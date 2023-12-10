export interface Player {
  id: string
  name: string
  teamId: TeamId
  isGameMaster: boolean
}

export type GameStatus = 'waiting' | 'playing' | 'finished'

export interface ImageCard {
  imageId: string,
  imageTeam: TeamId | "neutral" | "dead",
  flippedByTeam: TeamId
  isHint: boolean
  index: number, // Index in grid
}

export type TeamId = 'teamRed' | 'teamBlue' | ''

export interface Team {
  teamId: TeamId
  nbTryLeft: number
}

export interface Game {
  teams: Record<TeamId, Team>
  players: Record<string, Player>
  gameStatus: GameStatus
  teamPlaying: TeamId
  images: Record<string, ImageCard>
  winner: TeamId
}

// 8 Red
// 9 Blue
// 7 neutral
// 1 death
// 25 TOTAL

// 16 TOTAL
// 1 death
// 6 blue
// 6 red
// 3 neutral
