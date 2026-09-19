import { PITCH, type Ball, type MatchEvent, type MatchInput, type MatchPlayer, type MatchState, type Team } from './types'
import { resolvePenaltyShot, type AimPoint, type PenaltyResult } from './penalty'

let eventSeq = 0

// Ball gravity for open-play flight (shots/passes/clearances now carry real
// height, not just a cosmetic bob) — same constant the penalty flight solve
// in penalty.ts uses, so a lofted shot and a penalty read as the same physics.
export const GRAVITY = 20
const GROUND_BOUNCE_DAMPING = 0.45
const POST_RADIUS = 0.5
// A kicked ball must clear this much distance from where it was struck
// before its own kicker is eligible to receive it again (see the pickup
// loop in stepMatch) — otherwise a stationary player (a goalkeeper
// distributing is the clearest case) instantly re-catches their own kick.
const MIN_KICK_CLEAR_DIST = 3

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// --- Movement tuning -------------------------------------------------------
// Real footballers cruise around 3-6 m/s and hit ~8-9 m/s in short sprints;
// pitch units here are roughly metres. Speeds and pass/shot power were all
// tuned together (not just one knob) so the whole match slows to a football
// pace rather than an arcade one, while acceleration stays snappy enough
// that the controls still feel responsive on a touchscreen.
const BASE_ACCEL = 34 // units/s^2 reaching a jog
const BRAKE_ACCEL = 52 // stopping/redirecting is quicker than getting going
const DIVE_ACCEL = 60 // goalkeepers explode off their line for a save

function maxSpeed(p: MatchPlayer, sprint: boolean) {
  const staminaFactor = 0.65 + 0.35 * (p.stamina / 100)
  const base = 9 + (p.pace / 100) * 6
  return base * staminaFactor * (sprint ? 1.25 : 1)
}

/** Accelerate p's velocity toward (desiredVx, desiredVy) instead of snapping
 * to it instantly — this is what gives movement weight/momentum instead of
 * the twitchy, direction-on-a-dime feel of setting velocity directly. */
function steerTo(p: MatchPlayer, desiredVx: number, desiredVy: number, dt: number, accel: number) {
  const dvx = desiredVx - p.vx
  const dvy = desiredVy - p.vy
  const dv = Math.hypot(dvx, dvy)
  const maxDelta = accel * dt
  if (dv <= maxDelta || dv < 1e-4) {
    p.vx = desiredVx
    p.vy = desiredVy
  } else {
    p.vx += (dvx / dv) * maxDelta
    p.vy += (dvy / dv) * maxDelta
  }
  p.x = clamp(p.x + p.vx * dt, 1, PITCH.width - 1)
  p.y = clamp(p.y + p.vy * dt, 1, PITCH.length - 1)
}

function opponentGoalY(team: Team) {
  return team === 'home' ? PITCH.length : 0
}

function ownGoalY(team: Team) {
  return team === 'home' ? 0 : PITCH.length
}

function pushEvent(state: MatchState, kind: MatchEvent['kind'], team: Team | null, text: string) {
  eventSeq += 1
  state.events.push({ id: eventSeq, time: state.clock, kind, team, text })
  if (state.events.length > 30) state.events.shift()
}

function nearestOpponentDist(state: MatchState, p: MatchPlayer) {
  let best = 999
  for (const o of state.players) {
    if (o.team === p.team || o.sentOff) continue
    const d = dist(p.x, p.y, o.x, o.y)
    if (d < best) best = d
  }
  return best
}

function bestPassTarget(state: MatchState, passer: MatchPlayer): MatchPlayer | null {
  let best: MatchPlayer | null = null
  let bestScore = -Infinity
  for (const t of state.players) {
    if (t.team !== passer.team || t.id === passer.id || t.sentOff) continue
    const d = dist(passer.x, passer.y, t.x, t.y)
    if (d < 4 || d > 75) continue
    const forwardness = passer.team === 'home' ? t.y - passer.y : passer.y - t.y
    const openness = nearestOpponentDist(state, t)
    // Forward progress matters more than pure openness — otherwise the AI
    // happily circulates the ball sideways/backwards to whoever is most
    // unmarked forever and an attack never actually develops.
    const score = forwardness * 0.95 + openness * 0.75 - d * 0.12
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }
  return best
}

function setBallVelocityTo(ball: Ball, fromX: number, fromY: number, toX: number, toY: number, speed: number, loft: number, kickerId: string) {
  const dx = toX - fromX
  const dy = toY - fromY
  const len = Math.hypot(dx, dy) || 1
  ball.vx = (dx / len) * speed
  ball.vy = (dy / len) * speed
  ball.vz = speed * loft
  ball.shotResolved = false
  ball.kickerId = kickerId
  ball.kickOriginX = fromX
  ball.kickOriginY = fromY
}

function opponentGoalX() {
  return PITCH.width / 2
}

function doPass(state: MatchState, passer: MatchPlayer) {
  const target = bestPassTarget(state, passer)
  const aim = target ?? { x: opponentGoalX(), y: opponentGoalY(passer.team) * 0.6 + passer.y * 0.4 }
  const inaccuracy = (1 - passer.passing / 100) * 4.5
  const jitterX = (Math.random() - 0.5) * inaccuracy
  const jitterY = (Math.random() - 0.5) * inaccuracy
  const loft = 0.04 + Math.random() * 0.05
  // Power scales with distance — a five-yard ball and a cross-field switch
  // shouldn't leave the boot at the same speed. Short passes stay soft and
  // accurate-feeling; long ones get real pace so they actually arrive.
  const passDist = dist(passer.x, passer.y, aim.x, aim.y)
  const power = clamp(20 + passDist * 0.42 + passer.passing * 0.14, 22, 58)
  setBallVelocityTo(state.ball, passer.x, passer.y, aim.x + jitterX, aim.y + jitterY, power, loft, passer.id)
  state.ball.ownerId = null
  state.ball.lastTouchTeam = passer.team
}

function doShoot(state: MatchState, shooter: MatchPlayer) {
  const goalY = opponentGoalY(shooter.team)
  const spread = (1 - shooter.shooting / 100) * 11
  const targetX = PITCH.width / 2 + (Math.random() - 0.5) * spread
  const power = 34 + shooter.shooting * 0.3
  // Better finishers keep the ball down and precise; wilder shooters loft it
  // more — which is also what lets a shot balloon over the bar realistically.
  const loft = clamp(0.09 + (1 - shooter.shooting / 100) * 0.22 + (Math.random() - 0.5) * 0.14, 0.02, 0.55)
  setBallVelocityTo(state.ball, shooter.x, shooter.y, targetX, goalY, power, loft, shooter.id)
  state.ball.ownerId = null
  state.ball.lastTouchTeam = shooter.team
}

function startRestart(state: MatchState, phase: MatchState['phase'], team: Team, x: number, y: number, log?: string) {
  state.phase = phase
  state.restartTeam = team
  state.restartSpot = { x: clamp(x, 2, PITCH.width - 2), y: clamp(y, 2, PITCH.length - 2) }
  state.phaseTimer = phase === 'penalty' ? 999 : 1.4
  state.ball.ownerId = null
  state.ball.vx = 0
  state.ball.vy = 0
  state.ball.vz = 0
  state.ball.z = 0
  state.ball.x = state.restartSpot.x
  state.ball.y = state.restartSpot.y
  if (log) pushEvent(state, phase === 'corner' ? 'corner' : phase === 'penalty' ? 'penalty' : 'whistle', team, log)
}

function resolveOutOfPlay(state: MatchState) {
  const b = state.ball
  const goalLeft = PITCH.width / 2 - PITCH.goalWidth / 2
  const goalRight = PITCH.width / 2 + PITCH.goalWidth / 2

  if (b.y <= 0 || b.y >= PITCH.length) {
    const atHomeEnd = b.y <= 0
    const inGoal = b.x >= goalLeft && b.x <= goalRight && b.z <= PITCH.goalHeight
    const defendingTeam: Team = atHomeEnd ? 'home' : 'away'
    const attackingTeam: Team = atHomeEnd ? 'away' : 'home'

    if (inGoal) {
      const scorer: Team = b.lastTouchTeam ?? attackingTeam
      state.score[scorer] += 1
      state.phase = 'goal'
      state.phaseTimer = 2.4
      pushEvent(state, 'goal', scorer, scorer === 'home' ? 'Гол! FC Astra забивает!' : 'Гол в ваши ворота...')
      return
    }

    if (b.lastTouchTeam === defendingTeam) {
      const cornerX = b.x < PITCH.width / 2 ? 2 : PITCH.width - 2
      startRestart(state, 'corner', attackingTeam, cornerX, atHomeEnd ? 3 : PITCH.length - 3, 'Угловой!')
    } else {
      startRestart(state, 'goalkick', defendingTeam, PITCH.width / 2, atHomeEnd ? 6 : PITCH.length - 6)
    }
    return
  }

  if (b.x <= 0 || b.x >= PITCH.width) {
    const throwTeam: Team = b.lastTouchTeam === 'home' ? 'away' : 'home'
    startRestart(state, 'throwin', throwTeam, clamp(b.x, 3, PITCH.width - 3), b.y, 'Аут')
  }
}

/** A shot that's about to cross the goal line right at the edge of the
 * frame — the post or the bar — deflects back into play instead of
 * scoring or sailing dead, same as a real woodwork shot. Real physics (the
 * ball's own x/y/z at the moment it reaches the line), not a scripted
 * outcome, decides whether this triggers. Returns true if it handled the
 * frame this frame, in which case resolveOutOfPlay should be skipped. */
function checkGoalFrameCollision(state: MatchState): boolean {
  const b = state.ball
  const nearHomeLine = b.y <= 1.2
  const nearAwayLine = b.y >= PITCH.length - 1.2
  if (!nearHomeLine && !nearAwayLine) return false

  const goalLeft = PITCH.width / 2 - PITCH.goalWidth / 2
  const goalRight = PITCH.width / 2 + PITCH.goalWidth / 2
  const inMouthX = b.x > goalLeft - POST_RADIUS && b.x < goalRight + POST_RADIUS
  const nearPost = inMouthX && (Math.abs(b.x - goalLeft) < POST_RADIUS || Math.abs(b.x - goalRight) < POST_RADIUS)
  const nearBar = inMouthX && b.z > PITCH.goalHeight - POST_RADIUS && b.z < PITCH.goalHeight + POST_RADIUS

  const hitPost = nearPost && b.z < PITCH.goalHeight
  const hitBar = nearBar && !hitPost

  if (!hitPost && !hitBar) return false

  const team: Team = nearHomeLine ? 'home' : 'away'
  pushEvent(state, 'whistle', team, hitPost ? 'Штанга!' : 'Перекладина!')
  b.vy = -b.vy * 0.5
  if (hitPost) b.vx = -b.vx * 0.6
  if (hitBar) b.vz = -Math.abs(b.vz) * 0.5
  b.y = nearHomeLine ? 1.3 : PITCH.length - 1.3
  b.shotResolved = true
  return true
}

// --- Tackling & fouls --------------------------------------------------
// A challenge is only ever rolled when a defender actually commits to one
// (see the call sites below) — simply running or standing near an opponent
// never reaches this function. What happens once a challenge IS attempted
// depends on how it was made, not a flat dice roll:
//  - closing speed: a shoulder-to-shoulder jog alongside the ball carrier is
//    almost never a foul; a full-speed, mistimed lunge often is.
//  - distance to the ball: winning the ball cleanly rarely draws a whistle;
//    a challenge made well away from the ball reads as playing the man.
//  - approach from behind: the classic reckless-tackle case, penalised harder.
function attemptTackle(state: MatchState, tackler: MatchPlayer, carrier: MatchPlayer) {
  const relVx = tackler.vx - carrier.vx
  const relVy = tackler.vy - carrier.vy
  const closingSpeed = Math.hypot(relVx, relVy)

  const ballDist = dist(tackler.x, tackler.y, state.ball.x, state.ball.y)

  const carrierSpeed = Math.hypot(carrier.vx, carrier.vy)
  let fromBehind = false
  if (carrierSpeed > 0.8) {
    const toTacklerX = tackler.x - carrier.x
    const toTacklerY = tackler.y - carrier.y
    const toTacklerLen = Math.hypot(toTacklerX, toTacklerY) || 1
    // Dot of "carrier's forward direction" with "direction toward tackler":
    // strongly negative means the tackler is coming from behind the runner.
    const facing = (toTacklerX * carrier.vx + toTacklerY * carrier.vy) / (toTacklerLen * carrierSpeed)
    fromBehind = facing < -0.45
  }

  const skillFactor = clamp((tackler.defending - carrier.dribbling) / 140, -0.5, 0.5)
  const successProb = clamp(0.58 + skillFactor - closingSpeed * 0.02, 0.2, 0.88)

  if (Math.random() < successProb) {
    // Clean challenge — ball won fairly, no need to even roll for a foul.
    state.ball.ownerId = tackler.id
    state.ball.vx = 0
    state.ball.vy = 0
    state.ball.vz = 0
    state.ball.z = 0
    state.ball.shotResolved = true
    return
  }

  let foulChance = 0.08
  foulChance += Math.max(0, closingSpeed - 3.2) * 0.05
  if (ballDist > 3.2) foulChance += 0.14
  if (fromBehind) foulChance += 0.16
  foulChance = clamp(foulChance, 0.03, 0.58)

  if (Math.random() >= foulChance) {
    // Failed to win it and it wasn't reckless enough to be a foul — the ball
    // just breaks away from the challenge instead of stopping play.
    const kickAngle = Math.random() * Math.PI * 2
    state.ball.vx += Math.cos(kickAngle) * 3
    state.ball.vy += Math.sin(kickAngle) * 3
    state.ball.ownerId = null
    return
  }

  const inBox =
    (tackler.team === 'home' && carrier.y < PITCH.boxDepth) ||
    (tackler.team === 'away' && carrier.y > PITCH.length - PITCH.boxDepth)

  if (inBox) {
    startRestart(state, 'penalty', carrier.team, PITCH.width / 2, tackler.team === 'home' ? 12 : PITCH.length - 12, 'Пенальти!')
  } else {
    startRestart(state, 'freekick', carrier.team, tackler.x, tackler.y, 'Штрафной удар')
  }

  // Reckless, from-behind, or high-speed challenges are the ones that earn
  // cards — a mistimed-but-fair-looking tackle usually just gets a talking-to.
  let cardChance = 0.1
  if (fromBehind) cardChance += 0.2
  if (closingSpeed > 8) cardChance += 0.15
  if (Math.random() < cardChance) {
    tackler.yellow += 1
    state.cards[tackler.team].yellow += 1
    if (tackler.yellow >= 2) {
      tackler.sentOff = true
      state.cards[tackler.team].red += 1
      pushEvent(state, 'red', tackler.team, `${tackler.name}: вторая жёлтая, удаление!`)
    } else {
      pushEvent(state, 'yellow', tackler.team, `${tackler.name}: жёлтая карточка`)
    }
  }
}

// --- Goalkeepers ---------------------------------------------------------
// Both teams' keepers run through this exact same function with the exact
// same formula — there is no separate, easier path for the AI side. Saves
// are resolved once per shot via a predicted line-crossing point rather than
// re-rolling every frame the ball happens to be "close", which is what made
// fast shots feel like a coin flip before (a shot could cross the whole save
// window between two frames and never get evaluated at a sane distance).
//
// Possession itself runs through an explicit state machine (GkState) so a
// keeper who's just caught the ball has one clear job — decide, act, get
// back — instead of drifting under logic that was really written for
// "where do I stand when I don't have the ball".
const GK_DECISION_MIN = 2 // seconds — never resolves instantly
const GK_DECISION_MAX = 4 // seconds — never stalls either
const GK_DANGER_RADIUS = 11 // an opponent this close forces a clearance over a risky short pass
const GK_PASS_MIN_GAP = 6 // a teammate needs at least this much space to count as "safe"

function isSafeGkPassOption(state: MatchState, gk: MatchPlayer, t: MatchPlayer) {
  const d = dist(gk.x, gk.y, t.x, t.y)
  if (d < 4 || d > 56) return false
  return nearestOpponentDist(state, t) >= GK_PASS_MIN_GAP
}

/** Priority: an unmarked defender first (building out from the back is the
 * lowest-risk option), then an unmarked midfielder, then any other safe
 * teammate. The opposing side is never even in this list — `state.players`
 * is filtered to `gk.team` up front. */
function chooseGkPassTarget(state: MatchState, gk: MatchPlayer): MatchPlayer | null {
  const teammates = state.players.filter((t) => t.team === gk.team && t.id !== gk.id && !t.isGK && !t.sentOff)
  const nearestSafeInGroup = (group: 'DEF' | 'MID') =>
    teammates
      .filter((t) => t.positionGroup === group && isSafeGkPassOption(state, gk, t))
      .sort((a, b) => dist(gk.x, gk.y, a.x, a.y) - dist(gk.x, gk.y, b.x, b.y))[0] ?? null

  return (
    nearestSafeInGroup('DEF') ??
    nearestSafeInGroup('MID') ??
    teammates.filter((t) => isSafeGkPassOption(state, gk, t)).sort((a, b) => dist(gk.x, gk.y, a.x, a.y) - dist(gk.x, gk.y, b.x, b.y))[0] ??
    null
  )
}

/** The single place a goalkeeper's possession timer is ever set — called
 * from every code path that can hand a keeper the ball (a save, the
 * generic loose-ball pickup, a restart) so gkState and nextDecisionAt
 * always change together atomically. Two separate call sites racing to
 * set nextDecisionAt with different formulas (one of them a stale,
 * much-shorter legacy value) was the actual cause of a keeper sometimes
 * releasing the ball earlier than its 2-4s decision window.
 *
 * The deadline itself is only ever rolled fresh if there wasn't already
 * one still pending. A defender standing right next to the keeper can
 * repeatedly pop the ball loose in a failed tackle and have it resettle
 * at the keeper's feet a fraction of a second later — each of those
 * micro-reclaims calls this function again, and re-rolling a brand new
 * 2-4s window every single time let sustained pressure chain those resets
 * indefinitely, which is exactly what made the keeper appear to hang onto
 * the ball forever. Keeping the original deadline means the decision
 * timer is bounded no matter how many times possession flickers within
 * the same contested moment. */
function gkGainsPossession(gk: MatchPlayer, now: number) {
  gk.gkState = 'hasBall'
  if (now >= gk.nextDecisionAt) {
    gk.nextDecisionAt = now + GK_DECISION_MIN + Math.random() * (GK_DECISION_MAX - GK_DECISION_MIN)
  }
}

/** Called once the HasBall decision timer elapses: pass to the safest
 * available teammate, or clear it long into space if opponents are right
 * on top of the keeper or nobody's safely reachable. Either way this is
 * real ball physics (setBallVelocityTo), never a position snap. */
function goalkeeperAct(state: MatchState, gk: MatchPlayer) {
  const underPressure = nearestOpponentDist(state, gk) < GK_DANGER_RADIUS
  const target = underPressure ? null : chooseGkPassTarget(state, gk)

  if (target) {
    gk.gkState = 'passing'
    setBallVelocityTo(state.ball, gk.x, gk.y, target.x, target.y, 26 + gk.passing * 0.16, 0.05, gk.id)
  } else {
    gk.gkState = 'clearing'
    const aimY = gk.team === 'home' ? PITCH.length * (0.5 + Math.random() * 0.25) : PITCH.length * (0.5 - Math.random() * 0.25)
    const aimX = clamp(PITCH.width / 2 + (Math.random() - 0.5) * 46, 6, PITCH.width - 6)
    setBallVelocityTo(state.ball, gk.x, gk.y, aimX, aimY, 38 + gk.passing * 0.06, 0.26, gk.id)
  }
  state.ball.ownerId = null
  state.ball.lastTouchTeam = gk.team
  gk.gkState = 'returning'
}

function updateGoalkeeper(state: MatchState, gk: MatchPlayer, dt: number, now: number) {
  const b = state.ball

  // HasBall: stop moving and decide, on a bounded timer — this is the fix
  // for "the keeper just wanders after catching it": the old code kept
  // running full defensive-positioning movement every frame even while
  // holding the ball (whose position was itself glued to the keeper), so
  // the target the keeper chased fed back on itself instead of ever being
  // a place to stand still and think.
  if (b.ownerId === gk.id) {
    if (gk.gkState !== 'hasBall') gkGainsPossession(gk, now)
    steerTo(gk, 0, 0, dt, BRAKE_ACCEL)
    if (now >= gk.nextDecisionAt) goalkeeperAct(state, gk)
    return
  }

  if (gk.gkState === 'hasBall' || gk.gkState === 'passing' || gk.gkState === 'clearing') gk.gkState = 'returning'

  const own = ownGoalY(gk.team)
  const goalLeft = PITCH.width / 2 - PITCH.goalWidth / 2
  const goalRight = PITCH.width / 2 + PITCH.goalWidth / 2
  const distToOwnGoal = Math.abs(b.y - own)
  const ballSpeed = Math.hypot(b.vx, b.vy)

  // MovingToBall: a loose ball resting or trickling around the box is
  // actively claimed instead of only ever being shadowed from the goal
  // line — previously nothing but incidental proximity ever brought the
  // keeper to it.
  const inBox = distToOwnGoal < PITCH.boxDepth + 4 && Math.abs(b.x - PITCH.width / 2) < PITCH.boxWidth / 2 + 4
  const claimable = !b.ownerId && inBox && (b.shotResolved || ballSpeed < 9)
  if (claimable) {
    gk.gkState = 'movingToBall'
    moveToward(gk, b.x, b.y, dt, true)
    return
  }
  if (gk.gkState === 'movingToBall') gk.gkState = 'normal'

  // Normal / returning: defensive shadow positioning.
  const targetX = clamp(b.x, goalLeft + 1, goalRight - 1)
  const advance = distToOwnGoal < 32 ? clamp((32 - distToOwnGoal) / 32, 0, 1) * 6.5 : 0
  const targetY = own + (gk.team === 'home' ? 2.5 + advance : -2.5 - advance)
  const urgent = distToOwnGoal < 22
  const toTargetX = targetX - gk.x
  const toTargetY = targetY - gk.y
  const toTargetD = Math.hypot(toTargetX, toTargetY)
  const gkSpeed = maxSpeed(gk, urgent)
  const desiredVx = toTargetD < 0.4 ? 0 : (toTargetX / toTargetD) * gkSpeed
  const desiredVy = toTargetD < 0.4 ? 0 : (toTargetY / toTargetD) * gkSpeed
  steerTo(gk, desiredVx, desiredVy, dt, urgent ? DIVE_ACCEL : BASE_ACCEL)
  if (gk.gkState === 'returning' && toTargetD < 1) gk.gkState = 'normal'

  if (b.ownerId || b.shotResolved) return

  // A teammate's pass or backpass must never be treated as an incoming
  // shot to save — only react to the ball if the LAST TOUCH was the
  // opposing side. This was the actual cause of the "pass teleports to the
  // keeper" bug: without this check, any fast ball heading toward this
  // goal — including a routine pass from this keeper's own defender — ran
  // through the same predicted-save roll as a real shot, and a successful
  // "catch" snapped possession (and therefore the ball's on-screen
  // position, which follows its owner) to the keeper well before the pass
  // had actually travelled there.
  if (b.lastTouchTeam === gk.team) return

  const headingTowardThisGoal = gk.team === 'home' ? b.vy < 0 : b.vy > 0
  if (!headingTowardThisGoal || ballSpeed < 9) return

  const tToLine = b.vy !== 0 ? (own - b.y) / b.vy : Infinity
  if (tToLine <= 0 || tToLine > 2.4) return

  const predictedX = b.x + b.vx * tToLine
  const predictedZ = b.z + b.vz * tToLine - 0.5 * GRAVITY * tToLine * tToLine
  const onTarget = predictedX > goalLeft - 1.5 && predictedX < goalRight + 1.5
  if (!onTarget) {
    return // heading wide — nothing for the keeper to do
  }
  if (predictedZ > PITCH.goalHeight + 0.35) {
    return // ballooning over the bar — not even a save opportunity
  }

  const distToPredicted = Math.abs(gk.x - predictedX)
  const diveSpeed = maxSpeed(gk, true) * 1.35
  const reachMargin = tToLine - distToPredicted / diveSpeed

  b.shotResolved = true

  if (reachMargin < -0.3) {
    // Physically cannot get across in time — no roll, the ball beats them clean.
    return
  }

  const marginFactor = clamp(reachMargin / 0.55, 0, 1)
  const skill = (gk.defending + gk.physical) / 2
  const powerPenalty = clamp((ballSpeed - 26) / 55, 0, 0.32)
  const saveProb = clamp(0.4 + marginFactor * 0.4 + (skill / 100) * 0.3 - powerPenalty, 0.06, 0.93)

  if (Math.random() >= saveProb) {
    return // beaten — goal
  }

  if (marginFactor > 0.55 && ballSpeed < 46) {
    // Comfortable save — caught and held. HasBall picks up next frame.
    b.ownerId = gk.id
    b.vx = 0
    b.vy = 0
    b.vz = 0
    b.z = 0
  } else {
    // Stretch save / parry: can't hold it, knocked away instead — a loose
    // ball or scramble rather than a clean take. Parries tend to pop up.
    const deflectAngle = Math.random() * Math.PI * 2
    b.x = gk.x
    b.y = gk.y
    b.vx = Math.cos(deflectAngle) * 6
    b.vy = Math.sin(deflectAngle) * 6 + (gk.team === 'home' ? 3 : -3)
    b.vz = 3 + Math.random() * 3
  }
}

function moveToward(p: MatchPlayer, tx: number, ty: number, dt: number, sprint: boolean) {
  const dx = tx - p.x
  const dy = ty - p.y
  const d = Math.hypot(dx, dy)
  if (d < 0.4) {
    steerTo(p, 0, 0, dt, BRAKE_ACCEL)
    return
  }
  const speed = maxSpeed(p, sprint)
  steerTo(p, (dx / d) * speed, (dy / d) * speed, dt, BASE_ACCEL)
}

function updateAiOutfield(state: MatchState, p: MatchPlayer, dt: number, now: number) {
  const b = state.ball
  const hasBall = b.ownerId === p.id
  const teamHasBall = b.ownerId ? state.players.find((x) => x.id === b.ownerId)?.team === p.team : false

  if (hasBall) {
    if (now >= p.nextDecisionAt) {
      p.nextDecisionAt = now + 0.35 + Math.random() * 0.25
      const goalDist = dist(p.x, p.y, opponentGoalX(), opponentGoalY(p.team))
      const pressure = nearestOpponentDist(state, p)
      // A clear-cut chance close to goal gets taken almost regardless of
      // pressure — a striker one-on-one doesn't pass it off. Further out,
      // only shoot with room to actually strike it properly.
      const closeRangeChance = goalDist < 22 && pressure > 1.8 && Math.random() < 0.72 + p.shooting / 400
      const longRangeChance = goalDist < 48 && pressure > 4.5 && Math.random() < 0.5 + p.shooting / 250
      if (closeRangeChance || longRangeChance) {
        doShoot(state, p)
        return
      }
      if (pressure < 8) {
        const target = bestPassTarget(state, p)
        if (target) {
          doPass(state, p)
          return
        }
      }
    }
    const forwardY = p.team === 'home' ? p.y + 14 : p.y - 14
    const nearestOppD = nearestOpponentDist(state, p)
    const steerX = p.x + (Math.random() - 0.5) * (nearestOppD < 10 ? 8 : 2)
    moveToward(p, clamp(steerX, 4, PITCH.width - 4), clamp(forwardY, 2, PITCH.length - 2), dt, true)
    return
  }

  if (teamHasBall) {
    const owner = state.players.find((x) => x.id === b.ownerId)!
    const supportBias = p.team === 'home' ? (owner.y - p.homeY) * 0.3 : (p.homeY - owner.y) * -0.3
    const tx = p.homeX + (owner.x - PITCH.width / 2) * 0.15
    const ty = p.homeY + supportBias
    moveToward(p, tx, ty, dt, false)
    return
  }

  const carrier = b.ownerId ? state.players.find((x) => x.id === b.ownerId) : null
  if (carrier && carrier.team !== p.team) {
    const dToCarrier = dist(p.x, p.y, carrier.x, carrier.y)
    const isClosestDefender = state.players
      .filter((x) => x.team === p.team && !x.isGK && !x.sentOff)
      .every((x) => x.id === p.id || dist(x.x, x.y, carrier.x, carrier.y) >= dToCarrier)

    if (isClosestDefender && dToCarrier < 30) {
      moveToward(p, carrier.x, carrier.y, dt, true)
      // Jockey at close range rather than diving into a challenge every
      // single cooldown tick — most of the time a marking defender just
      // stays goal-side and waits for a better moment.
      if (dToCarrier < 1.8 && now >= p.nextDecisionAt) {
        p.nextDecisionAt = now + 1.1 + Math.random() * 0.4
        if (Math.random() < 0.5) attemptTackle(state, p, carrier)
      }
      return
    }
  }

  // Nobody owns the ball right now (mid-pass reception, a blocked shot, a
  // tackle that broke it loose, a rebound off the keeper...). Without this,
  // every player just drifted back to their formation slot and left the
  // ball to sit wherever it ran out of momentum — the closest player on
  // each side should actually contest a loose ball instead.
  if (!b.ownerId) {
    const dToBall = dist(p.x, p.y, b.x, b.y)
    const isNearestTeammate = state.players
      .filter((x) => x.team === p.team && !x.isGK && !x.sentOff)
      .every((x) => x.id === p.id || dist(x.x, x.y, b.x, b.y) >= dToBall)
    if (isNearestTeammate && dToBall < 50) {
      moveToward(p, b.x, b.y, dt, true)
      return
    }
  }

  moveToward(p, p.homeX, p.homeY, dt, false)
}

export function stepMatch(state: MatchState, dt: number, input: MatchInput, now: number): MatchState {
  if (state.phase === 'goal' || state.phase === 'halftime' || state.phase === 'fulltime') {
    state.phaseTimer -= dt
    if (state.phaseTimer <= 0) {
      if (state.phase === 'goal') resetForKickoff(state)
      else if (state.phase === 'halftime') startSecondHalf(state)
    }
    return state
  }

  if (state.phase !== 'play') {
    state.phaseTimer -= dt
    if (state.phaseTimer <= 0 && state.phase !== 'penalty') {
      resumePlayFromRestart(state, now)
    }
    const phaseNow = state.phase as MatchState['phase']
    if (phaseNow !== 'play') return state
  }

  state.clock += dt
  if (state.clock >= state.halfDuration) {
    if (state.half === 1) {
      state.phase = 'halftime'
      state.phaseTimer = 2
      pushEvent(state, 'ht', null, 'Перерыв')
    } else {
      state.phase = 'fulltime'
      state.phaseTimer = 999
      pushEvent(state, 'ft', null, 'Финальный свисток')
    }
    return state
  }

  const controlled = state.players.find((p) => p.id === state.userControlledId)!

  for (const p of state.players) {
    if (p.sentOff) continue
    if (p.isGK) {
      updateGoalkeeper(state, p, dt, now)
      continue
    }
    if (p.id === controlled.id) {
      const len = Math.hypot(input.moveX, input.moveY)
      if (len > 0.05) {
        const speed = maxSpeed(p, input.sprint)
        // The match camera is a fixed sideline camera (see render3d.ts): on
        // screen, pitch-length (sim y) reads as left/right and pitch-width
        // (sim x) reads as near/far. So joystick "right" (moveX) must drive
        // sim y, and joystick "up" (moveY) must drive sim x.
        steerTo(p, (-input.moveY / len) * speed, (-input.moveX / len) * speed, dt, BASE_ACCEL)
      } else {
        steerTo(p, 0, 0, dt, BRAKE_ACCEL)
      }

      if (state.ball.ownerId === p.id) {
        if (input.pass) doPass(state, p)
        else if (input.shoot) doShoot(state, p)
      } else if (input.shoot) {
        const carrier = state.ball.ownerId ? state.players.find((x) => x.id === state.ball.ownerId) : null
        if (carrier && carrier.team !== p.team && dist(p.x, p.y, carrier.x, carrier.y) < 3 && now >= state.tackleCooldownUntil) {
          state.tackleCooldownUntil = now + 0.6
          attemptTackle(state, p, carrier)
        }
      }
      continue
    }
    updateAiOutfield(state, p, dt, now)
  }

  const b = state.ball
  if (b.ownerId) {
    const owner = state.players.find((x) => x.id === b.ownerId)
    if (owner && !owner.sentOff) {
      const len = Math.hypot(owner.vx, owner.vy) || 1
      const aheadX = owner.vx / len
      const aheadY = owner.vy / len
      b.x = owner.x + aheadX * 1.4
      b.y = owner.y + aheadY * 1.4
      b.vx = 0
      b.vy = 0
      b.vz = 0
      b.z = 0
    } else {
      b.ownerId = null
    }
  } else {
    b.vx *= 1 - Math.min(1, 0.85 * dt)
    b.vy *= 1 - Math.min(1, 0.85 * dt)
    b.x += b.vx * dt
    b.y += b.vy * dt

    // Real vertical flight: gravity pulls a lofted shot/pass/clearance back
    // down, and it bounces (losing energy) rather than skimming the ground
    // forever — this is what lets a shot actually clear the bar or thump
    // off the woodwork instead of always arriving at goal-mouth height.
    b.vz -= GRAVITY * dt
    b.z += b.vz * dt
    if (b.z <= 0) {
      b.z = 0
      b.vz = Math.abs(b.vz) > 1.5 ? -b.vz * GROUND_BOUNCE_DAMPING : 0
    }

    if (b.x <= 0.5 || b.x >= PITCH.width - 0.5) {
      resolveOutOfPlay(state)
      return state
    }
    if (b.y <= 0.5 || b.y >= PITCH.length - 0.5) {
      if (!checkGoalFrameCollision(state)) {
        resolveOutOfPlay(state)
        return state
      }
    }

    // A kick only carries the ball a fraction of a unit in a single 20ms
    // frame — well inside the pickup radius below — so without this, the
    // player who just kicked it (a stationary goalkeeper distributing is
    // the clearest case) would instantly reclaim their own pass or
    // clearance before it had gone anywhere, over and over.
    const kickerStillClearing = b.kickerId !== null && dist(b.x, b.y, b.kickOriginX, b.kickOriginY) < MIN_KICK_CLEAR_DIST

    let nearest: MatchPlayer | null = null
    let nearestD = 999
    for (const p of state.players) {
      if (p.sentOff) continue
      if (kickerStillClearing && p.id === b.kickerId) continue
      const d = dist(p.x, p.y, b.x, b.y)
      if (d < nearestD) {
        nearestD = d
        nearest = p
      }
    }
    if (nearest && nearestD < 2.4) {
      b.ownerId = nearest.id
      b.lastTouchTeam = nearest.team
      b.shotResolved = true
      if (nearest.isGK) {
        // Set atomically with gkState so there's never a frame where the
        // keeper owns the ball but its state machine hasn't caught up yet
        // (see gkGainsPossession) — matters here specifically because a
        // keeper can regain a loose ball this same way moments after losing
        // it to a challenge, mid-hold.
        gkGainsPossession(nearest, now)
      } else if (nearest.team === 'home') {
        state.userControlledId = nearest.id
      }
    }
  }

  if (!b.ownerId) {
    const ballOwnerTeamNearby = state.players.find((p) => !p.sentOff && !p.isGK && dist(p.x, p.y, b.x, b.y) < 20 && p.team === 'home')
    if (ballOwnerTeamNearby && state.userControlledId !== ballOwnerTeamNearby.id) {
      let closestHome: MatchPlayer | null = null
      let closestD = 999
      for (const p of state.players) {
        if (p.team !== 'home' || p.sentOff || p.isGK) continue
        const d = dist(p.x, p.y, b.x, b.y)
        if (d < closestD) {
          closestD = d
          closestHome = p
        }
      }
      if (closestHome) state.userControlledId = closestHome.id
    }
  }

  return state
}

function resumePlayFromRestart(state: MatchState, now: number) {
  const spot = state.restartSpot
  const team = state.restartTeam
  if (spot && team) {
    let closest: MatchPlayer | null = null
    let closestD = 999
    for (const p of state.players) {
      if (p.team !== team || p.sentOff) continue
      const d = dist(p.x, p.y, spot.x, spot.y)
      if (d < closestD) {
        closestD = d
        closest = p
      }
    }
    if (closest) {
      closest.x = spot.x
      closest.y = spot.y
      state.ball.ownerId = closest.id
      state.ball.shotResolved = true
      if (closest.isGK) {
        gkGainsPossession(closest, now)
      } else if (closest.team === 'home') {
        state.userControlledId = closest.id
      }
    }
  }
  state.phase = 'play'
  state.restartSpot = null
}

/** Finds the shooter/keeper pair for the penalty currently awarded — used
 * by MatchScreen to drive the tap-to-aim UI and by applyPenaltyOutcome to
 * resolve it. */
export function getPenaltyParticipants(state: MatchState): { taker: MatchPlayer; gk: MatchPlayer } | null {
  const taker = state.players.find((p) => p.team === state.restartTeam && !p.isGK)
  const gk = state.players.find((p) => p.team !== state.restartTeam && p.isGK)
  if (!taker || !gk) return null
  return { taker, gk }
}

export function resolvePenaltyAttempt(state: MatchState, aim: AimPoint, keeperDive: AimPoint): PenaltyResult | null {
  const participants = getPenaltyParticipants(state)
  if (!participants) return null
  return resolvePenaltyShot(participants.taker, participants.gk, aim, keeperDive)
}

/** Applies a resolved penalty attempt to match state: scores the goal, or
 * hands the defending side a goal kick, and (re)starts play accordingly.
 * The actual ball-flight animation is driven separately by MatchScreen —
 * this just settles the outcome once the flight finishes. */
export function applyPenaltyOutcome(state: MatchState, result: PenaltyResult) {
  const shootingTeam = state.restartTeam!
  const defendingTeam: Team = shootingTeam === 'home' ? 'away' : 'home'
  const b = state.ball
  b.x = result.world.x
  b.y = result.world.y
  b.z = result.world.z
  b.vx = 0
  b.vy = 0
  b.vz = 0
  b.ownerId = null
  b.lastTouchTeam = shootingTeam

  if (result.outcome === 'goal') {
    state.score[shootingTeam] += 1
    state.phase = 'goal'
    state.phaseTimer = 2.4
    pushEvent(state, 'goal', shootingTeam, 'Пенальти реализован!')
    return
  }

  const label: Record<Exclude<PenaltyResult['outcome'], 'goal'>, string> = {
    save: 'Вратарь отразил пенальти!',
    miss: 'Мимо ворот!',
    post: 'Штанга!',
    bar: 'Перекладина!',
  }
  pushEvent(state, 'whistle', shootingTeam, label[result.outcome])
  startRestart(state, 'goalkick', defendingTeam, PITCH.width / 2, shootingTeam === 'home' ? PITCH.length - 6 : 6)
}

function resetForKickoff(state: MatchState) {
  const kickoffTeam: Team = Math.random() < 0.5 ? 'home' : 'away'
  for (const p of state.players) {
    p.x = p.homeX
    p.y = p.homeY
    p.vx = 0
    p.vy = 0
  }
  state.ball.x = PITCH.width / 2
  state.ball.y = PITCH.length / 2
  state.ball.z = 0
  state.ball.vx = 0
  state.ball.vy = 0
  state.ball.vz = 0
  state.ball.shotResolved = true
  const starter = state.players.find((p) => p.team === kickoffTeam && !p.isGK)
  if (starter) {
    state.ball.ownerId = starter.id
    state.ball.lastTouchTeam = kickoffTeam
    if (kickoffTeam === 'home') state.userControlledId = starter.id
  }
  state.phase = 'play'
}

function startSecondHalf(state: MatchState) {
  state.half = 2
  state.clock = 0
  for (const p of state.players) {
    p.homeY = PITCH.length - p.homeY
  }
  resetForKickoff(state)
}
