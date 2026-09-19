export const PITCH = {
  width: 100,
  length: 155,
  goalWidth: 20,
  goalHeight: 2.44,
  boxWidth: 60,
  boxDepth: 22,
  sixWidth: 30,
  sixDepth: 8,
}

export type Team = 'home' | 'away'

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT'

/** Goalkeeper decision states (see engine.ts's updateGoalkeeper): most of
 * the time a keeper is 'normal' (defensive shadow positioning) or
 * 'movingToBall' (actively claiming a loose ball in their box). Gaining
 * possession moves them to 'hasBall', which freezes movement and starts a
 * bounded decision timer; 'passing'/'clearing' are the one-tick actions
 * that timer resolves into, after which they're 'returning' (racing back
 * toward goal) before settling back to 'normal'. */
export type GkState = 'normal' | 'movingToBall' | 'hasBall' | 'passing' | 'clearing' | 'returning'

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
  positionGroup: PositionGroup
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
  /** Only meaningful for goalkeepers — see GkState. */
  gkState: GkState
}

export interface Ball {
  x: number
  y: number
  /** Height off the ground. 0 = resting/rolling on the turf. */
  z: number
  vx: number
  vy: number
  vz: number
  ownerId: string | null
  lastTouchTeam: Team | null
  /** Guards the goalkeeper save check so a single shot is only judged once,
   * even though the ball may satisfy the "in range" test for several frames
   * while it closes in on goal. Reset whenever the ball is kicked afresh. */
  shotResolved: boolean
  /** Who last kicked the ball, and from where — lets the loose-ball pickup
   * check stop that same player from instantly re-claiming their own pass
   * or clearance before it's actually travelled anywhere (a kick only
   * covers a fraction of a unit in one 20ms frame, well inside the normal
   * pickup radius, so without this a stationary kicker — a goalkeeper
   * distributing is the clearest case — would catch their own kick back
   * immediately, forever, instead of it ever reaching the pitch). */
  kickerId: string | null
  kickOriginX: number
  kickOriginY: number
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
