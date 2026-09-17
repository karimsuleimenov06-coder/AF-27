import { PITCH, type MatchPlayer, type Team } from './types'

/** Gravity used for the penalty flight's ballistic solve — shared with the
 * general open-play ball physics in engine.ts so a penalty's arc feels like
 * the same football, not a special-cased minigame. */
export const PENALTY_GRAVITY = 20

/** A point inside (or just outside) the goal mouth, normalised so px runs
 * -1 (left post) .. 1 (right post) and pz runs 0 (ground) .. 1 (crossbar).
 * Values can go slightly beyond that range — that's a shot/dive aimed wide
 * or over, not a clamping bug. */
export interface AimPoint {
  px: number
  pz: number
}

export type PenaltyOutcome = 'goal' | 'save' | 'post' | 'bar' | 'miss'

export interface PenaltyResult {
  outcome: PenaltyOutcome
  actual: AimPoint
  world: { x: number; y: number; z: number }
  flightSeconds: number
}

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function aimToWorld(aim: AimPoint, attackingTeam: Team): { x: number; y: number; z: number } {
  const x = PITCH.width / 2 + aim.px * (PITCH.goalWidth / 2)
  const z = Math.max(0, aim.pz) * PITCH.goalHeight
  const y = attackingTeam === 'home' ? PITCH.length : 0
  return { x, y, z }
}

const POST_BAND = 0.09

function classifyZone(px: number, pz: number): 'target' | 'post' | 'bar' | 'miss' {
  if (px < -1.15 || px > 1.15 || pz < -0.15 || pz > 1.15) return 'miss'
  const inWidth = Math.abs(px) <= 1
  const inHeight = pz >= 0 && pz <= 1
  if (inWidth && inHeight) return 'target'
  if (!inWidth && Math.abs(px) <= 1 + POST_BAND && pz <= 1 + POST_BAND) return 'post'
  if (!inHeight && pz > 1 && pz <= 1 + POST_BAND && Math.abs(px) <= 1 + POST_BAND) return 'bar'
  return 'miss'
}

/** Resolves a penalty attempt from where the shooter aimed and where the
 * keeper dived. Accuracy jitter is applied around the shooter's aim before
 * classifying goal / post / bar / miss, and only a shot that lands inside
 * the frame ever reaches the goalkeeper's save roll — matching a real
 * penalty, where a shot that's already wide beats no keeper decision. */
export function resolvePenaltyShot(shooter: MatchPlayer, keeper: MatchPlayer, aim: AimPoint, keeperDive: AimPoint): PenaltyResult {
  const accuracy = clampNum(shooter.shooting / 100, 0.15, 1)
  const spread = (1 - accuracy) * 0.55
  const actualPx = clampNum(aim.px + (Math.random() - 0.5) * 2 * spread, -1.4, 1.4)
  const actualPz = clampNum(aim.pz + (Math.random() - 0.5) * 2 * spread, -0.3, 1.3)

  const zone = classifyZone(actualPx, actualPz)
  let outcome: PenaltyOutcome

  if (zone !== 'target') {
    outcome = zone
  } else {
    // Tuned against real penalty stats (~75-80% scored, ~15-20% saved): a
    // keeper diving the wrong way should rarely get there at all, so reach
    // stays modest even for a great keeper — most saves come from actually
    // reading the shot (see pickAiKeeperDive), not from raw reach.
    const dist = Math.hypot(actualPx - keeperDive.px, (actualPz - keeperDive.pz) * 0.7)
    const reach = 0.24 + (keeper.defending / 100) * 0.26 + (keeper.physical / 100) * 0.1
    const reaction = clampNum(1 - dist / reach, 0, 1)
    const saveChance = clampNum(reaction * 0.75 + Math.random() * 0.08, 0.02, 0.85)
    outcome = Math.random() < saveChance ? 'save' : 'goal'
  }

  const world = aimToWorld({ px: actualPx, pz: actualPz }, shooter.team)
  const speed = 30 + shooter.shooting * 0.28
  const dist2d = Math.hypot(world.x - shooter.x, world.y - shooter.y)
  const flightSeconds = clampNum(dist2d / speed, 0.35, 1.1)

  return { outcome, actual: { px: actualPx, pz: actualPz }, world, flightSeconds }
}

/** Position of the ball along a penalty's flight at elapsed time t (seconds),
 * given it launches from (x0,y0,0) and must arrive at `target` at time
 * `flightSeconds` — a real ballistic arc, not a straight-line teleport. */
export function penaltyBallPosition(x0: number, y0: number, target: { x: number; y: number; z: number }, flightSeconds: number, t: number) {
  const clampedT = clampNum(t, 0, flightSeconds)
  const vx = (target.x - x0) / flightSeconds
  const vy = (target.y - y0) / flightSeconds
  const vz = (target.z + 0.5 * PENALTY_GRAVITY * flightSeconds * flightSeconds) / flightSeconds
  return {
    x: x0 + vx * clampedT,
    y: y0 + vy * clampedT,
    z: Math.max(0, vz * clampedT - 0.5 * PENALTY_GRAVITY * clampedT * clampedT),
  }
}

/** AI picks a shot aim — biased toward the corners the better the shooter,
 * but never a certainty, so it still occasionally misses on its own. */
export function pickAiShotAim(shooter: MatchPlayer): AimPoint {
  const skill = shooter.shooting / 100
  const side = Math.random() < 0.5 ? -1 : 1
  const px = side * clampNum(0.45 + Math.random() * 0.4 + skill * 0.15, 0, 1.05)
  const pz = clampNum(0.2 + Math.random() * 0.55, 0, 1)
  return { px, pz }
}

/** AI keeper dive: mostly a guess, but a sharper keeper "reads" the shooter
 * and matches the real aim point more often. */
export function pickAiKeeperDive(keeper: MatchPlayer, actualShotAim: AimPoint | null): AimPoint {
  const readChance = 0.12 + (keeper.defending / 100) * 0.35
  if (actualShotAim && Math.random() < readChance) return actualShotAim
  const side = Math.random() < 0.5 ? -1 : 1
  return { px: side * (0.4 + Math.random() * 0.6), pz: 0.15 + Math.random() * 0.6 }
}
