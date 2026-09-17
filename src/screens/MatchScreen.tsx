import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSquadStore } from '../state/squadStore'
import { useAppStore, type GraphicsQuality } from '../state/appStore'
import { useTournamentStore } from '../state/tournamentStore'
import { ASTRA_CUP_CLUBS } from '../data/tournament'
import { createMatch, RIVAL_CLUB_NAME } from '../match/setup'
import { stepMatch, getPenaltyParticipants, resolvePenaltyAttempt, applyPenaltyOutcome } from '../match/engine'
import { pickAiShotAim, pickAiKeeperDive, penaltyBallPosition, aimToWorld, type AimPoint, type PenaltyOutcome, type PenaltyResult } from '../match/penalty'
import { MatchRenderer3D, QUALITY_TIERS_3D } from '../match/render3d'
import type { MatchEvent, MatchInput, MatchState, Team } from '../match/types'
import Joystick from '../components/match/Joystick'
import { BallIcon } from '../components/Icons'
import { playCard, playGoal, playConcede, playKick, playTackle, playWhistle, unlockAudio } from '../lib/sound'

type Stage = 'intro' | 'live' | 'result'

type PenaltyRole = 'shooter' | 'keeper'
type PenaltyStageKind = 'aim' | 'flight' | 'outcome'

interface PenaltyUiState {
  role: PenaltyRole
  stage: PenaltyStageKind
  myAim: AimPoint
  aiAim: AimPoint
  countdown: number
  outcome: PenaltyOutcome | null
}

const OUTCOME_LABEL: Record<PenaltyOutcome, string> = {
  goal: 'ГОЛ!',
  save: 'Вратарь спас!',
  miss: 'Мимо ворот',
  post: 'Штанга!',
  bar: 'Перекладина!',
}

const QUALITY_INDEX: Record<GraphicsQuality, number> = { low: 0, medium: 1, high: 2, ultra: 3 }
const HALF_SECONDS = 90

function formatClock(elapsed: number, half: 1 | 2) {
  const total = half === 1 ? elapsed : HALF_SECONDS + elapsed
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function enterImmersive() {
  try {
    if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
  } catch {
    /* fullscreen not available, ignore */
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    if (orientation?.lock) await orientation.lock('landscape')
  } catch {
    /* orientation lock not available, ignore */
  }
}

function exitImmersive() {
  try {
    if (document.fullscreenElement) void document.exitFullscreen()
  } catch {
    /* ignore */
  }
  try {
    const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void }
    orientation?.unlock?.()
  } catch {
    /* ignore */
  }
}

export default function MatchScreen() {
  const navigate = useNavigate()
  const { formationId, lineup } = useSquadStore()
  const settings = useAppStore((s) => s.settings)
  const addCoins = useAppStore((s) => s.addCoins)
  const addGems = useAppStore((s) => s.addGems)

  const activeFixtureIndex = useTournamentStore((s) => s.activeFixtureIndex)
  const fixtures = useTournamentStore((s) => s.fixtures)
  const recordActiveFixtureResult = useTournamentStore((s) => s.recordActiveFixtureResult)
  const clearActiveFixture = useTournamentStore((s) => s.clearActiveFixture)
  const tournamentFixture = activeFixtureIndex !== null ? fixtures[activeFixtureIndex] : null
  const opponentClub = tournamentFixture
    ? ASTRA_CUP_CLUBS.find((c) => c.id === (tournamentFixture.home === 'astra' ? tournamentFixture.away : tournamentFixture.home))
    : null

  const settingsRef = useRef(settings)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const [stage, setStage] = useState<Stage>('intro')
  const stateRef = useRef<MatchState | null>(null)
  const inputRef = useRef<MatchInput>({ moveX: 0, moveY: 0, pass: false, shoot: false, sprint: false })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<MatchRenderer3D | null>(null)
  const qualityIndexRef = useRef(2)
  const rewardedRef = useRef(false)
  const penaltyShownRef = useRef(false)
  const lastEventIdRef = useRef(0)
  const prevBallOwnerRef = useRef<string | null>(null)

  const [hud, setHud] = useState({
    score: { home: 0, away: 0 },
    clock: 0,
    half: 1 as 1 | 2,
    phase: 'kickoff' as MatchState['phase'],
    lastEvent: null as MatchEvent | null,
    cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
  })
  const [penalty, setPenalty] = useState<PenaltyUiState | null>(null)
  const penaltyRef = useRef<PenaltyUiState | null>(null)
  const flightRef = useRef<{
    startX: number
    startY: number
    startedAt: number
    result: PenaltyResult
    gkId: string
    gkStartX: number
    attackingTeam: Team
  } | null>(null)
  useEffect(() => {
    penaltyRef.current = penalty
  }, [penalty])
  const [result, setResult] = useState<{ score: { home: number; away: number }; reward: number; gemReward: number } | null>(null)
  const [goalFlash, setGoalFlash] = useState<null | 'home' | 'away'>(null)

  const startMatch = () => {
    void enterImmersive()
    unlockAudio()
    stateRef.current = createMatch(formationId, lineup, HALF_SECONDS, opponentClub?.strength ?? 68)
    rewardedRef.current = false
    penaltyShownRef.current = false
    lastEventIdRef.current = 0
    prevBallOwnerRef.current = null
    flightRef.current = null
    setPenalty(null)
    setStage('live')
  }

  const leaveMatch = () => {
    exitImmersive()
    navigate(tournamentFixture ? '/tournaments' : '/')
  }

  useEffect(() => exitImmersive, [])

  useEffect(() => {
    if (stage !== 'live') return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const renderer = new MatchRenderer3D(canvas, QUALITY_TIERS_3D[qualityIndexRef.current])
    rendererRef.current = renderer

    const resize = () => {
      renderer.resize(container.clientWidth, container.clientHeight)
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let last = performance.now()
    let hudAcc = 0
    let perfAcc = 0
    let frameCount = 0

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      const now = t / 1000
      const state = stateRef.current
      if (!state) return

      stepMatch(state, dt, inputRef.current, now)
      inputRef.current.pass = false
      inputRef.current.shoot = false

      // Penalty flight: while phase stays 'penalty' the engine leaves the
      // ball alone, so this scripted arc (real gravity-driven trajectory
      // toward the resolved outcome, plus the keeper diving toward their
      // chosen point) drives the ball and goalkeeper directly.
      const flight = flightRef.current
      if (flight && penaltyRef.current?.stage === 'flight') {
        const elapsed = (t - flight.startedAt) / 1000
        const pos = penaltyBallPosition(flight.startX, flight.startY, flight.result.world, flight.result.flightSeconds, elapsed)
        state.ball.x = pos.x
        state.ball.y = pos.y
        state.ball.z = pos.z
        const gk = state.players.find((p) => p.id === flight.gkId)
        if (gk) {
          const diveAim = penaltyRef.current.role === 'shooter' ? penaltyRef.current.aiAim : penaltyRef.current.myAim
          const diveWorld = aimToWorld(diveAim, flight.attackingTeam)
          const diveProgress = Math.min(1, elapsed / 0.4)
          gk.x = flight.gkStartX + (diveWorld.x - flight.gkStartX) * diveProgress
        }
        if (elapsed >= flight.result.flightSeconds) {
          applyPenaltyOutcome(state, flight.result)
          flightRef.current = null
          setPenalty((p) => (p ? { ...p, stage: 'outcome' } : p))
          setTimeout(() => setPenalty(null), 1400)
        }
      }

      for (const event of state.events) {
        if (event.id <= lastEventIdRef.current) continue
        lastEventIdRef.current = event.id
        if (event.kind === 'goal') {
          if (event.team === 'home') playGoal()
          else playConcede()
          setGoalFlash(event.team)
          setTimeout(() => setGoalFlash(null), 900)
          if (event.team) {
            for (const p of state.players) {
              if (p.team === event.team && !p.sentOff) renderer.playAction(p.id, 'celebrate')
            }
          }
        } else if (event.kind === 'yellow' || event.kind === 'red') {
          playCard()
        } else if (event.kind === 'whistle' || event.kind === 'corner' || event.kind === 'penalty' || event.kind === 'ht' || event.kind === 'ft') {
          playWhistle()
        }
      }

      const currentOwner = state.ball.ownerId
      if (prevBallOwnerRef.current && !currentOwner) {
        playKick()
        renderer.playAction(prevBallOwnerRef.current, 'kick')
      } else if (prevBallOwnerRef.current && currentOwner && prevBallOwnerRef.current !== currentOwner) {
        const prevTeam = state.players.find((p) => p.id === prevBallOwnerRef.current)?.team
        const nextPlayer = state.players.find((p) => p.id === currentOwner)
        if (prevTeam && nextPlayer && prevTeam !== nextPlayer.team) {
          playTackle()
          renderer.playAction(currentOwner, nextPlayer.isGK ? 'save' : 'tackle')
        }
      }
      prevBallOwnerRef.current = currentOwner

      if (state.phase === 'penalty') {
        if (!penaltyShownRef.current) {
          penaltyShownRef.current = true
          const participants = getPenaltyParticipants(state)
          const role: PenaltyRole = state.restartTeam === 'home' ? 'shooter' : 'keeper'
          const aiAim =
            participants && role === 'keeper'
              ? pickAiShotAim(participants.taker)
              : participants
                ? pickAiKeeperDive(participants.gk, null)
                : { px: 0, pz: 0.5 }
          setPenalty({ role, stage: 'aim', myAim: { px: 0, pz: 0.5 }, aiAim, countdown: 5, outcome: null })
        }
      } else {
        penaltyShownRef.current = false
      }

      if (state.phase === 'fulltime' && !rewardedRef.current) {
        rewardedRef.current = true
        const win = state.score.home > state.score.away
        const draw = state.score.home === state.score.away
        const reward = win ? 350 : draw ? 150 : 80
        const gemReward = win ? 3 : draw ? 1 : 0
        addCoins(reward)
        if (gemReward > 0) addGems(gemReward)
        if (tournamentFixture) {
          if (tournamentFixture.home === 'astra') recordActiveFixtureResult(state.score.home, state.score.away)
          else recordActiveFixtureResult(state.score.away, state.score.home)
        }
        setTimeout(() => setResult({ score: { ...state.score }, reward, gemReward }), 500)
      }

      renderer.render(state)

      hudAcc += dt
      if (hudAcc > 0.15) {
        hudAcc = 0
        setHud({
          score: { ...state.score },
          clock: state.clock,
          half: state.half,
          phase: state.phase,
          lastEvent: state.events.length ? state.events[state.events.length - 1] : null,
          cards: { home: { ...state.cards.home }, away: { ...state.cards.away } },
        })
      }

      frameCount += 1
      perfAcc += dt
      if (perfAcc > 1.5) {
        const fps = frameCount / perfAcc
        const s = settingsRef.current
        if (s.autoQuality) {
          if (fps < 42 && qualityIndexRef.current > 0) qualityIndexRef.current -= 1
          else if (fps > 56 && qualityIndexRef.current < 3) qualityIndexRef.current += 1
        } else {
          qualityIndexRef.current = QUALITY_INDEX[s.graphicsQuality]
        }
        renderer.setQuality(QUALITY_TIERS_3D[qualityIndexRef.current])
        perfAcc = 0
        frameCount = 0
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      rendererRef.current = null
    }
  }, [stage, addCoins, addGems])

  const launchPenalty = (current: PenaltyUiState) => {
    const state = stateRef.current
    if (!state) return
    const participants = getPenaltyParticipants(state)
    if (!participants) {
      setPenalty(null)
      return
    }
    const shotAim = current.role === 'shooter' ? current.myAim : current.aiAim
    const diveAim = current.role === 'shooter' ? current.aiAim : current.myAim
    const result = resolvePenaltyAttempt(state, shotAim, diveAim)
    if (!result) {
      setPenalty(null)
      return
    }
    flightRef.current = {
      startX: participants.taker.x,
      startY: participants.taker.y,
      startedAt: performance.now(),
      result,
      gkId: participants.gk.id,
      gkStartX: participants.gk.x,
      attackingTeam: participants.taker.team,
    }
    rendererRef.current?.playAction(participants.gk.id, 'save')
    setPenalty({ ...current, stage: 'flight', outcome: result.outcome })
  }

  // 5-second aiming window: the countdown itself ticks down toward zero, and
  // reaching it auto-fires the shot with whatever point was last tapped (the
  // starting centre point if the player never tapped at all).
  useEffect(() => {
    if (!penalty || penalty.stage !== 'aim') return
    if (penalty.countdown <= 0) {
      launchPenalty(penalty)
      return
    }
    const timeout = setTimeout(() => {
      setPenalty((p) => (p && p.stage === 'aim' ? { ...p, countdown: p.countdown - 1 } : p))
    }, 1000)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penalty])

  const setAim = (px: number, pz: number) => {
    setPenalty((p) => (p && p.stage === 'aim' ? { ...p, myAim: { px, pz } } : p))
  }

  const phaseLabel: Partial<Record<MatchState['phase'], string>> = {
    kickoff: 'Начало матча',
    goal: 'ГОЛ!',
    halftime: 'Перерыв',
    fulltime: 'Финальный свисток',
    freekick: 'Штрафной',
    corner: 'Угловой',
    goalkick: 'Удар от ворот',
    throwin: 'Аут',
    penalty: 'Пенальти',
  }

  return (
    <div className="fixed inset-0 z-[200] bg-night text-white">
      {stage === 'intro' && (
        <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
          <BallIcon className="h-11 w-11 text-cyan" />
          <div>
            <p className="font-display text-sm font-semibold tracking-widest text-ink-2 uppercase">
              {tournamentFixture ? `Кубок Astra · Тур ${tournamentFixture.round + 1}` : 'Быстрый матч'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">FC Astra — {opponentClub?.name ?? RIVAL_CLUB_NAME}</h1>
            <p className="mt-2 text-sm text-ink">2 тайма по {Math.round(HALF_SECONDS / 60)} мин · Схема {formationId}</p>
          </div>
          <button
            onClick={startMatch}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan to-violet px-8 py-3 font-display text-base font-bold text-night active:scale-[0.97]"
          >
            Начать матч
          </button>
          <p className="max-w-md text-xs text-ink-2">
            Джойстик слева — движение. Кнопки справа: ПАС, УДАР (тоже отбор мяча) и РЫВОК.
          </p>
          <button onClick={() => navigate('/')} className="mt-2 text-xs font-semibold text-ink-2 underline">
            Выйти в меню
          </button>
        </div>
      )}

      {result && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-sm font-semibold tracking-widest text-ink-2 uppercase">
            {result.score.home > result.score.away ? 'Победа' : result.score.home === result.score.away ? 'Ничья' : 'Поражение'}
          </p>
          <p className="font-display text-4xl font-bold text-white tabular-nums">
            {result.score.home} : {result.score.away}
          </p>
          <p className="text-sm text-ink">FC Astra — {opponentClub?.name ?? RIVAL_CLUB_NAME}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5">
              <span className="font-display text-sm font-semibold text-gold">+{result.reward} монет</span>
            </div>
            {result.gemReward > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-4 py-1.5">
                <span className="font-display text-sm font-semibold text-cyan">+{result.gemReward} кристаллов</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-3">
            {tournamentFixture ? (
              <button
                onClick={() => {
                  setResult(null)
                  clearActiveFixture()
                  exitImmersive()
                  navigate('/tournaments')
                }}
                className="rounded-xl bg-gradient-to-r from-cyan to-violet px-5 py-2.5 font-display text-sm font-semibold text-night"
              >
                Вернуться в турнир
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setResult(null)
                    setStage('intro')
                  }}
                  className="rounded-xl border border-border bg-surface px-5 py-2.5 font-display text-sm font-semibold text-white"
                >
                  Играть снова
                </button>
                <button
                  onClick={() => {
                    exitImmersive()
                    navigate('/')
                  }}
                  className="rounded-xl bg-gradient-to-r from-cyan to-violet px-5 py-2.5 font-display text-sm font-semibold text-night"
                >
                  В меню
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {stage === 'live' && !result && (
        <div className="relative h-full w-full">
          <div ref={containerRef} className="absolute inset-0">
            <canvas ref={canvasRef} className="h-full w-full" />
          </div>

          <div className="safe-top pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-night/80 px-3 py-1.5 backdrop-blur-sm">
              <span className="font-display text-[11px] font-semibold text-ink-2">FC ASTRA</span>
              {hud.cards.home.yellow + hud.cards.home.red > 0 && (
                <span className="text-[10px]">
                  🟨{hud.cards.home.yellow} 🟥{hud.cards.home.red}
                </span>
              )}
            </div>

            <div className="pointer-events-auto flex flex-col items-center rounded-xl border border-border bg-night/80 px-4 py-1.5 backdrop-blur-sm">
              <span className="font-display text-lg font-bold text-white tabular-nums">
                {hud.score.home} : {hud.score.away}
              </span>
              <span className="font-display text-[11px] font-semibold text-cyan tabular-nums">
                {formatClock(hud.clock, hud.half)} · {hud.half}Т
              </span>
            </div>

            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-night/80 px-3 py-1.5 backdrop-blur-sm">
              {hud.cards.away.yellow + hud.cards.away.red > 0 && (
                <span className="text-[10px]">
                  🟨{hud.cards.away.yellow} 🟥{hud.cards.away.red}
                </span>
              )}
              <span className="font-display text-[11px] font-semibold text-ink-2">{(opponentClub?.name ?? RIVAL_CLUB_NAME).toUpperCase()}</span>
            </div>

            <button
              onClick={leaveMatch}
              aria-label="Выйти"
              className="pointer-events-auto ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-night/80 text-ink backdrop-blur-sm"
            >
              ✕
            </button>
          </div>

          {hud.phase !== 'play' && phaseLabel[hud.phase] && (
            <div className="pointer-events-none absolute top-14 left-1/2 z-20 -translate-x-1/2 rounded-full border border-cyan/40 bg-night/90 px-4 py-1.5 font-display text-sm font-bold text-cyan">
              {phaseLabel[hud.phase]}
            </div>
          )}

          {goalFlash && (
            <div
              className={`pointer-events-none absolute inset-0 z-10 animate-[goalFlash_0.9s_ease-out] ${
                goalFlash === 'home' ? 'bg-cyan/25' : 'bg-danger/25'
              }`}
            />
          )}

          <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
            <div className="pointer-events-auto">
              <Joystick
                onChange={(x, y) => {
                  inputRef.current.moveX = x
                  inputRef.current.moveY = y
                }}
              />
            </div>
            <div className="pointer-events-auto flex items-center gap-2.5">
              <button
                onPointerDown={() => {
                  inputRef.current.sprint = true
                }}
                onPointerUp={() => {
                  inputRef.current.sprint = false
                }}
                onPointerLeave={() => {
                  inputRef.current.sprint = false
                }}
                className="flex h-13 w-13 touch-none items-center justify-center rounded-full border border-white/15 bg-black/35 font-display text-[10px] font-bold text-white active:bg-white/20"
              >
                РЫВОК
              </button>
              <button
                onPointerDown={() => {
                  inputRef.current.pass = true
                }}
                className="flex h-15 w-15 touch-none items-center justify-center rounded-full border border-cyan/40 bg-cyan/25 font-display text-xs font-bold text-cyan active:bg-cyan/40"
              >
                ПАС
              </button>
              <button
                onPointerDown={() => {
                  inputRef.current.shoot = true
                }}
                className="flex h-15 w-15 touch-none items-center justify-center rounded-full border border-gold/40 bg-gold/25 font-display text-xs font-bold text-gold active:bg-gold/40"
              >
                УДАР
              </button>
            </div>
          </div>

          {penalty && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center">
              <p className="font-display text-xs font-semibold tracking-widest text-ink-2 uppercase">
                {penalty.role === 'shooter' ? 'Пенальти — ваш удар' : 'Пенальти — вы вратарь'}
              </p>

              {penalty.stage === 'aim' && (
                <>
                  <p className="text-sm text-ink">
                    {penalty.role === 'shooter' ? 'Коснитесь ворот — туда полетит удар' : 'Коснитесь ворот — туда прыгнет вратарь'}
                  </p>
                  <div
                    onPointerDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const px = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1))
                      const pz = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
                      setAim(px, pz)
                    }}
                    className="relative aspect-[3/1] w-full max-w-sm touch-none rounded-lg border-4 border-white bg-white/5"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 16px), repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 16px)',
                    }}
                  >
                    <div
                      className="absolute h-8 w-8 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-gold bg-gold/40"
                      style={{ left: `${((penalty.myAim.px + 1) / 2) * 100}%`, bottom: `${penalty.myAim.pz * 100}%` }}
                    />
                  </div>
                  <span className="font-display text-5xl font-black text-gold tabular-nums">
                    {penalty.countdown > 0 ? penalty.countdown : penalty.role === 'shooter' ? 'УДАР' : 'ПРЫЖОК'}
                  </span>
                </>
              )}

              {penalty.stage === 'flight' && (
                <p className="font-display text-3xl font-black text-white">{penalty.role === 'shooter' ? 'УДАР!' : 'ПРЫЖОК!'}</p>
              )}

              {penalty.stage === 'outcome' && penalty.outcome && (
                <p className={`font-display text-4xl font-black ${penalty.outcome === 'goal' ? 'text-cyan' : 'text-danger'}`}>
                  {OUTCOME_LABEL[penalty.outcome]}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
