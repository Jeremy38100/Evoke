export interface Player {
  id: string
  name: string
  teamId: TeamId
  isGameMaster: boolean
}

export enum GameStatus {
  WAITING_TO_START = 1,
  RUNNING = 2,
  ENDED = 3,
}

export interface ImageCard {
  imageId: string,
  imageTeam: TeamId | "neutral" | "dead",
  flippedByTeam: TeamId
  isHint: boolean
}

export type TeamId = 'teamRed' | 'teamBlue' | ''

export interface Team {
  teamId: TeamId
  nbTryLeft: number
}

export interface Game {
  gameId: string
  teams: Team[]
  players: Record<string, Player>
  gameStatus: GameStatus
  teamPlaying: TeamId
  images: ImageCard[]
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
