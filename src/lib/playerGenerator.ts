import { randomPlayerName } from '../data/namePool'
import { createPlayer, POSITION_GROUP, type Foot, type Player, type PlayerStats, type Position, type Rarity } from '../types/player'

const RATING_BAND: Record<Rarity, [number, number]> = {
  bronze: [46, 64],
  silver: [65, 74],
  gold: [75, 84],
  special: [85, 93],
  // Icons are never procedurally generated (see data/icons.ts) — this band
  // only exists so the Record stays exhaustive; generatePlayer('icon', ...)
  // should never actually be called.
  icon: [94, 94],
}

const WEIGHTED_POSITIONS: Position[] = [
  'GK', 'GK',
  'CB', 'CB', 'CB', 'LB', 'RB',
  'CDM', 'CM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'ST', 'ST', 'CF',
]

const EMPHASIS: Record<'GK' | 'DEF' | 'MID' | 'ATT', Partial<Record<keyof PlayerStats, number>>> = {
  GK: { defending: 1.25, physical: 1.1, passing: 0.9, shooting: 0.3, pace: 0.6, dribbling: 0.5 },
  DEF: { defending: 1.2, physical: 1.05, pace: 0.95, passing: 0.9, dribbling: 0.8, shooting: 0.6 },
  MID: { passing: 1.2, dribbling: 1.1, pace: 0.95, shooting: 0.85, defending: 0.85, physical: 0.85 },
  ATT: { shooting: 1.25, pace: 1.15, dribbling: 1.1, passing: 0.75, defending: 0.35, physical: 0.9 },
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v)))
}

function statsForTarget(position: Position, target: number): PlayerStats {
  const group = POSITION_GROUP[position]
  const emphasis = EMPHASIS[group]
  const keys: (keyof PlayerStats)[] = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']
  const stats = {} as PlayerStats
  for (const key of keys) {
    const mult = emphasis[key] ?? 1
    const jitter = (Math.random() - 0.5) * 10
    stats[key] = clamp(target * mult + jitter, 15, 96)
  }
  return stats
}

export function generatePlayer(rarity: Rarity, forcePosition?: Position): Player {
  const position = forcePosition ?? WEIGHTED_POSITIONS[Math.floor(Math.random() * WEIGHTED_POSITIONS.length)]
  const [min, max] = RATING_BAND[rarity]
  const target = min + Math.random() * (max - min)
  const stats = statsForTarget(position, target)
  const foot: Foot = Math.random() < 0.72 ? 'right' : 'left'
  const stamina = clamp(55 + Math.random() * 40, 50, 96)

  const player = createPlayer({
    id: `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: randomPlayerName(),
    position,
    stats,
    stamina,
    foot,
  })

  return player
}

export function rollRarity(odds: Record<Rarity, number>): Rarity {
  const roll = Math.random()
  let acc = 0
  const order: Rarity[] = ['icon', 'special', 'gold', 'silver', 'bronze']
  for (const r of order) {
    acc += odds[r]
    if (roll <= acc) return r
  }
  return 'bronze'
}
