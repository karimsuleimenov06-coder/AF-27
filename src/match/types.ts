export const PITCH = {
  width: 100,
  length: 155,
  goalWidth: 20,
  boxWidth: 60,
  boxDepth: 22,
  sixWidth: 30,
  sixDepth: 8,
}

export type Team = 'home' | 'away'

export type MatchPhase =
  | 'kickoff'
  | 'play'
  | 'goal'
  | 'halftime'
  | 'fulltime'
  | 'freekick'
  | 'corner'
  | 'goalkick'
  | 'penalty'
  | 'throwin'

export interface MatchPlayer {
  id: string
  team: Team
  isGK: boolean
  number: number
  name: string
  rating: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  x: number
  y: number
  vx: number
  vy: number
  homeX: number
  homeY: number
  stamina: number
  yellow: number
  sentOff: boolean
  nextDecisionAt: number
}

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  ownerId: string | null
  lastTouchTeam: Team | null
}

export interface MatchEvent {
  id: number
  time: number
  kind: 'goal' | 'yellow' | 'red' | 'whistle' | 'ht' | 'ft' | 'corner' | 'penalty'
  team: Team | null
  text: string
}

export interface MatchInput {
  moveX: number
  moveY: number
  pass: boolean
  shoot: boolean
  sprint: boolean
}

export interface MatchState {
  players: MatchPlayer[]
  ball: Ball
  half: 1 | 2
  clock: number
  halfDuration: number
  score: Record<Team, number>
  cards: Record<Team, { yellow: number; red: number }>
  phase: MatchPhase
  phaseTimer: number
  restartSpot: { x: number; y: number } | null
  restartTeam: Team | null
  userControlledId: string
  events: MatchEvent[]
  tackleCooldownUntil: number
}
