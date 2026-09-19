import { FORMATIONS, type FormationId } from '../data/formations'
import { getEffectivePlayer } from '../data/playerRepo'
import type { Lineup } from '../state/squadStore'
import { PITCH, type MatchPlayer, type MatchState } from './types'

export const RIVAL_CLUB_NAME = 'Ровекс Атлетик'

const RIVAL_NAMES = [
  'Роан Кестрель',
  'Джамал Осей',
  'Виго Латтимор',
  'Каспер Ройс',
  'Финн Маколей',
  'Тарик Бенхима',
  'Ноа Гриффит',
  'Лукас Верден',
  'Эмир Сарач',
  'Диего Оливарес',
  'Мило Стенгард',
]

function randRange(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min))
}

function statsForGroup(group: 'GK' | 'DEF' | 'MID' | 'ATT', strength = 68) {
  const base = randRange(strength - 10, strength + 10)
  const jitter = () => Math.max(20, Math.min(95, base + randRange(-10, 10)))
  switch (group) {
    case 'GK':
      return { pace: jitter(), shooting: randRange(10, 20), passing: jitter(), dribbling: randRange(20, 35), defending: jitter(), physical: jitter() }
    case 'DEF':
      return { pace: jitter(), shooting: randRange(15, 35), passing: jitter(), dribbling: jitter(), defending: jitter(), physical: jitter() }
    case 'MID':
      return { pace: jitter(), shooting: jitter(), passing: jitter(), dribbling: jitter(), defending: randRange(30, 60), physical: jitter() }
    case 'ATT':
      return { pace: jitter(), shooting: jitter(), passing: randRange(40, 65), dribbling: jitter(), defending: randRange(10, 25), physical: jitter() }
  }
}

function buildTeam(team: 'home' | 'away', formationId: FormationId, lineup: Lineup | null, strength = 68): MatchPlayer[] {
  const slots = FORMATIONS[formationId]
  return slots.map((slot, i) => {
    const homeX = slot.x * PITCH.width
    const homeY = team === 'home' ? slot.y * PITCH.length : PITCH.length - slot.y * PITCH.length

    if (lineup) {
      const playerId = lineup[slot.id]
      const data = playerId ? getEffectivePlayer(playerId) : undefined
      if (data) {
        return {
          id: data.id,
          team,
          isGK: data.position === 'GK',
          positionGroup: slot.group,
          number: i + 1,
          name: data.name,
          rating: data.rating,
          pace: data.stats.pace,
          shooting: data.stats.shooting,
          passing: data.stats.passing,
          dribbling: data.stats.dribbling,
          defending: data.stats.defending,
          physical: data.stats.physical,
          x: homeX,
          y: homeY,
          vx: 0,
          vy: 0,
          homeX,
          homeY,
          stamina: data.stamina,
          yellow: 0,
          sentOff: false,
          nextDecisionAt: 0,
          gkState: 'normal',
        }
      }
    }

    const stats = statsForGroup(slot.group, strength)
    const rating = Math.round((stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defending + stats.physical) / 6)
    return {
      id: `away-${slot.id}`,
      team,
      isGK: slot.group === 'GK',
      positionGroup: slot.group,
      number: i + 1,
      name: RIVAL_NAMES[i % RIVAL_NAMES.length],
      rating,
      ...stats,
      x: homeX,
      y: homeY,
      vx: 0,
      vy: 0,
      homeX,
      homeY,
      stamina: randRange(65, 90),
      yellow: 0,
      sentOff: false,
      nextDecisionAt: 0,
      gkState: 'normal',
    }
  })
}

export function createMatch(formationId: FormationId, lineup: Lineup, halfDurationSeconds = 180, opponentStrength = 68): MatchState {
  const home = buildTeam('home', formationId, lineup)
  const away = buildTeam('away', formationId, null, opponentStrength)
  const players = [...home, ...away]

  const userStarter = home.find((p) => !p.isGK) ?? home[0]

  return {
    players,
    ball: {
      x: PITCH.width / 2,
      y: PITCH.length / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      ownerId: null,
      lastTouchTeam: null,
      shotResolved: true,
      kickerId: null,
      kickOriginX: PITCH.width / 2,
      kickOriginY: PITCH.length / 2,
    },
    half: 1,
    clock: 0,
    halfDuration: halfDurationSeconds,
    score: { home: 0, away: 0 },
    cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
    phase: 'kickoff',
    phaseTimer: 1.5,
    restartSpot: null,
    restartTeam: 'home',
    userControlledId: userStarter.id,
    events: [],
    tackleCooldownUntil: 0,
  }
}
