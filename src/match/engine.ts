import { PITCH, type Ball, type MatchEvent, type MatchInput, type MatchPlayer, type MatchState, type Team } from './types'

let eventSeq = 0

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function maxSpeed(p: MatchPlayer, sprint: boolean) {
  const staminaFactor = 0.6 + 0.4 * (p.stamina / 100)
  const base = 16 + (p.pace / 100) * 14
  return base * staminaFactor * (sprint ? 1.25 : 1)
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
    const score = forwardness * 0.55 + openness * 1.3 - d * 0.12
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }
  return best
}

function setBallVelocityTo(ball: Ball, fromX: number, fromY: number, toX: number, toY: number, speed: number) {
  const dx = toX - fromX
  const dy = toY - fromY
  const len = Math.hypot(dx, dy) || 1
  ball.vx = (dx / len) * speed
  ball.vy = (dy / len) * speed
}

function doPass(state: MatchState, passer: MatchPlayer) {
  const target = bestPassTarget(state, passer)
  const aim = target ?? { x: opponentGoalX(), y: opponentGoalY(passer.team) * 0.6 + passer.y * 0.4 }
  const inaccuracy = (1 - passer.passing / 100) * 6
  const jitterX = (Math.random() - 0.5) * inaccuracy
  const jitterY = (Math.random() - 0.5) * inaccuracy
  setBallVelocityTo(state.ball, passer.x, passer.y, aim.x + jitterX, aim.y + jitterY, 62 + passer.passing * 0.35)
  state.ball.ownerId = null
  state.ball.lastTouchTeam = passer.team
}

function opponentGoalX() {
  return PITCH.width / 2
}

function doShoot(state: MatchState, shooter: MatchPlayer) {
  const goalY = opponentGoalY(shooter.team)
  const spread = (1 - shooter.shooting / 100) * 14
  const targetX = PITCH.width / 2 + (Math.random() - 0.5) * spread
  const power = 68 + shooter.shooting * 0.5
  setBallVelocityTo(state.ball, shooter.x, shooter.y, targetX, goalY, power)
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
    const inGoal = b.x >= goalLeft && b.x <= goalRight
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

function attemptFoul(state: MatchState, tackler: MatchPlayer, carrier: MatchPlayer) {
  const successProb = clamp(0.5 + (tackler.defending - carrier.dribbling) / 180, 0.12, 0.82)
  if (Math.random() < successProb) {
    state.ball.ownerId = tackler.id
    state.ball.vx = 0
    state.ball.vy = 0
    return
  }

  const foulChance = 0.32
  if (Math.random() < foulChance) {
    const inBox =
      (tackler.team === 'home' && carrier.y < PITCH.boxDepth) ||
      (tackler.team === 'away' && carrier.y > PITCH.length - PITCH.boxDepth)

    if (inBox) {
      startRestart(state, 'penalty', carrier.team, PITCH.width / 2, tackler.team === 'home' ? 12 : PITCH.length - 12, 'Пенальти!')
    } else {
      startRestart(state, 'freekick', carrier.team, tackler.x, tackler.y, 'Штрафной удар')
    }

    const cardRoll = Math.random()
    if (cardRoll < 0.22) {
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
}

function updateGoalkeeper(state: MatchState, gk: MatchPlayer, dt: number) {
  const own = ownGoalY(gk.team)
  const b = state.ball
  const targetX = clamp(b.x, PITCH.width / 2 - PITCH.goalWidth / 2 + 1, PITCH.width / 2 + PITCH.goalWidth / 2 - 1)
  const distToOwnGoal = Math.abs(b.y - own)
  const advance = distToOwnGoal < 30 ? clamp((30 - distToOwnGoal) / 30, 0, 1) * 6 : 0
  const targetY = own + (gk.team === 'home' ? 3 + advance : -3 - advance)

  moveToward(gk, targetX, targetY, dt, false)

  if (!b.ownerId) {
    const ballSpeed = Math.hypot(b.vx, b.vy)
    const movingTowardOwnGoal = gk.team === 'home' ? b.vy < -5 : b.vy > 5
    if (ballSpeed > 20 && movingTowardOwnGoal) {
      const d = dist(gk.x, gk.y, b.x, b.y)
      const reach = 7 + gk.physical / 18
      if (d < reach) {
        const saveProb = clamp(0.35 + (gk.defending + gk.physical) / 260 - ballSpeed / 400, 0.15, 0.92)
        if (Math.random() < saveProb) {
          b.ownerId = gk.id
          b.vx = 0
          b.vy = 0
        }
      }
    }
  }
}

function moveToward(p: MatchPlayer, tx: number, ty: number, dt: number, sprint: boolean) {
  const dx = tx - p.x
  const dy = ty - p.y
  const d = Math.hypot(dx, dy)
  if (d < 0.4) {
    p.vx *= 0.8
    p.vy *= 0.8
    return
  }
  const speed = maxSpeed(p, sprint)
  p.vx = (dx / d) * speed
  p.vy = (dy / d) * speed
  p.x += p.vx * dt
  p.y += p.vy * dt
  p.x = clamp(p.x, 1, PITCH.width - 1)
  p.y = clamp(p.y, 1, PITCH.length - 1)
}

function updateAiOutfield(state: MatchState, p: MatchPlayer, dt: number, now: number) {
  const b = state.ball
  const hasBall = b.ownerId === p.id
  const teamHasBall = b.ownerId ? state.players.find((x) => x.id === b.ownerId)?.team === p.team : false

  if (hasBall) {
    if (now >= p.nextDecisionAt) {
      p.nextDecisionAt = now + 0.45 + Math.random() * 0.3
      const goalDist = dist(p.x, p.y, opponentGoalX(), opponentGoalY(p.team))
      const pressure = nearestOpponentDist(state, p)
      if (goalDist < 42 && pressure > 6 && Math.random() < 0.5 + p.shooting / 250) {
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

    if (isClosestDefender && dToCarrier < 34) {
      moveToward(p, carrier.x, carrier.y, dt, true)
      if (dToCarrier < 2.2 && now >= p.nextDecisionAt) {
        p.nextDecisionAt = now + 0.7
        attemptFoul(state, p, carrier)
      }
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
      resumePlayFromRestart(state)
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
      updateGoalkeeper(state, p, dt)
      continue
    }
    if (p.id === controlled.id) {
      const len = Math.hypot(input.moveX, input.moveY)
      if (len > 0.05) {
        const speed = maxSpeed(p, input.sprint)
        // The match camera is a fixed sideline camera (see render3d.ts): on
        // screen, pitch-length (sim y) reads as left/right and pitch-width
        // (sim x) reads as near/far. So joystick "right" (moveX) must drive
        // sim y, and joystick "up" (moveY) must drive sim x — mapping the
        // stick straight to sim x/y (as before) made sideways input look
        // like forward/backward motion instead.
        p.vx = (-input.moveY / len) * speed
        p.vy = (-input.moveX / len) * speed
        p.x = clamp(p.x + p.vx * dt, 1, PITCH.width - 1)
        p.y = clamp(p.y + p.vy * dt, 1, PITCH.length - 1)
      } else {
        p.vx *= 0.85
        p.vy *= 0.85
      }

      if (state.ball.ownerId === p.id) {
        if (input.pass) doPass(state, p)
        else if (input.shoot) doShoot(state, p)
      } else if (input.shoot) {
        const carrier = state.ball.ownerId ? state.players.find((x) => x.id === state.ball.ownerId) : null
        if (carrier && carrier.team !== p.team && dist(p.x, p.y, carrier.x, carrier.y) < 3 && now >= state.tackleCooldownUntil) {
          state.tackleCooldownUntil = now + 0.5
          attemptFoul(state, p, carrier)
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
      b.x = owner.x + aheadX * 1.6
      b.y = owner.y + aheadY * 1.6
      b.vx = 0
      b.vy = 0
    } else {
      b.ownerId = null
    }
  } else {
    b.vx *= 1 - Math.min(1, 1.1 * dt)
    b.vy *= 1 - Math.min(1, 1.1 * dt)
    b.x += b.vx * dt
    b.y += b.vy * dt

    if (b.x <= 0.5 || b.x >= PITCH.width - 0.5) {
      resolveOutOfPlay(state)
      return state
    }
    if (b.y <= 0.5 || b.y >= PITCH.length - 0.5) {
      resolveOutOfPlay(state)
      return state
    }

    let nearest: MatchPlayer | null = null
    let nearestD = 999
    for (const p of state.players) {
      if (p.sentOff) continue
      const d = dist(p.x, p.y, b.x, b.y)
      if (d < nearestD) {
        nearestD = d
        nearest = p
      }
    }
    if (nearest && nearestD < 2.6) {
      b.ownerId = nearest.id
      b.lastTouchTeam = nearest.team
      if (nearest.team === 'home' && !nearest.isGK) {
        state.userControlledId = nearest.id
      }
    }
  }

  if (!b.ownerId && b.vx === 0 && b.vy === 0) {
    // stationary loose ball, handled by pickup above next tick
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

function resumePlayFromRestart(state: MatchState) {
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
      if (closest.team === 'home' && !closest.isGK) state.userControlledId = closest.id
    }
  }
  state.phase = 'play'
  state.restartSpot = null
}

export function resolvePenalty(state: MatchState, direction: 'left' | 'center' | 'right', power: number) {
  const taker = state.players.find((p) => p.team === state.restartTeam && !p.isGK)
  const gk = state.players.find((p) => p.team !== state.restartTeam && p.isGK)
  if (!taker || !gk) {
    state.phase = 'play'
    return
  }
  const dirX = direction === 'left' ? PITCH.width / 2 - 7 : direction === 'right' ? PITCH.width / 2 + 7 : PITCH.width / 2
  const gkGuess = Math.random() < 0.55 ? direction : (['left', 'center', 'right'] as const)[Math.floor(Math.random() * 3)]
  const saved = gkGuess === direction && Math.random() < 0.4 + gk.defending / 300

  const scoringTeam = state.restartTeam!
  if (!saved && power > 0.3) {
    state.score[scoringTeam] += 1
    pushEvent(state, 'goal', scoringTeam, 'Пенальти реализован!')
  } else {
    pushEvent(state, 'whistle', scoringTeam, saved ? 'Вратарь отразил пенальти!' : 'Мимо ворот!')
  }
  void dirX
  state.phase = 'goal'
  state.phaseTimer = 2
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
  state.ball.vx = 0
  state.ball.vy = 0
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
