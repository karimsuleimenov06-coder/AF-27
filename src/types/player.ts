export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'LWB'
  | 'RWB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'CF'
  | 'ST'

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'promo'

export type Foot = 'left' | 'right'

export interface PlayerStats {
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

export interface Player {
  id: string
  name: string
  position: Position
  rating: number
  rarity: Rarity
  stats: PlayerStats
  stamina: number
  foot: Foot
  value: number
}

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  GK: 'GK',
  CB: 'DEF',
  LB: 'DEF',
  RB: 'DEF',
  LWB: 'DEF',
  RWB: 'DEF',
  CDM: 'MID',
  CM: 'MID',
  CAM: 'MID',
  LM: 'MID',
  RM: 'MID',
  LW: 'ATT',
  RW: 'ATT',
  CF: 'ATT',
  ST: 'ATT',
}

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Вратарь',
  CB: 'Центральный защитник',
  LB: 'Левый защитник',
  RB: 'Правый защитник',
  LWB: 'Левый латераль',
  RWB: 'Правый латераль',
  CDM: 'Опорный полузащитник',
  CM: 'Центральный полузащитник',
  CAM: 'Атакующий полузащитник',
  LM: 'Левый полузащитник',
  RM: 'Правый полузащитник',
  LW: 'Левый нападающий',
  RW: 'Правый нападающий',
  CF: 'Второй нападающий',
  ST: 'Центральный нападающий',
}

export const POSITION_GROUP_LABEL: Record<PositionGroup, string> = {
  GK: 'Вратари',
  DEF: 'Защита',
  MID: 'Полузащита',
  ATT: 'Атака',
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  promo: 'BETA',
}

/** Rarity multiplies a player's base OVR-driven market value — AF27's own
 * curve, not copied from any other game's economy. */
export const RARITY_VALUE_MULT: Record<Rarity, number> = {
  common: 1,
  rare: 1.15,
  epic: 1.4,
  legendary: 1.85,
  promo: 1.6,
}

const OVERALL_WEIGHTS: Record<PositionGroup, PlayerStats> = {
  GK: { pace: 0.05, shooting: 0.02, passing: 0.1, dribbling: 0.05, defending: 0.48, physical: 0.3 },
  DEF: { pace: 0.15, shooting: 0.05, passing: 0.15, dribbling: 0.1, defending: 0.4, physical: 0.15 },
  MID: { pace: 0.13, shooting: 0.15, passing: 0.3, dribbling: 0.25, defending: 0.12, physical: 0.05 },
  ATT: { pace: 0.2, shooting: 0.35, passing: 0.1, dribbling: 0.25, defending: 0.02, physical: 0.08 },
}

export function calculateOverall(position: Position, stats: PlayerStats): number {
  const weights = OVERALL_WEIGHTS[POSITION_GROUP[position]]
  const weighted =
    stats.pace * weights.pace +
    stats.shooting * weights.shooting +
    stats.passing * weights.passing +
    stats.dribbling * weights.dribbling +
    stats.defending * weights.defending +
    stats.physical * weights.physical
  return Math.round(weighted)
}

/** Rarity is purely OVR-derived: the four 94-rated players are the only
 * ones that can ever land in 'legendary' as a natural consequence of the
 * band, not a separate hard-coded flag (see data/players.ts). 'promo' is
 * the one exception — it's never assigned by this function, only pinned
 * directly on hand-placed promo cards (see data/promoCards.ts). */
export function getRarity(rating: number): Rarity {
  if (rating >= 94) return 'legendary'
  if (rating >= 85) return 'epic'
  if (rating >= 70) return 'rare'
  return 'common'
}

export function calculateValue(rating: number, rarity: Rarity = getRarity(rating)): number {
  const raw = Math.pow(Math.max(rating - 30, 1), 3) / 25
  const base = Math.round(raw / 50) * 50
  return Math.round((base * RARITY_VALUE_MULT[rarity]) / 50) * 50
}

export function createPlayer(input: {
  id: string
  name: string
  position: Position
  stats: PlayerStats
  stamina: number
  foot: Foot
}): Player {
  const rating = calculateOverall(input.position, input.stats)
  const rarity = getRarity(rating)
  return {
    id: input.id,
    name: input.name,
    position: input.position,
    stats: input.stats,
    stamina: input.stamina,
    foot: input.foot,
    rating,
    rarity,
    value: calculateValue(rating, rarity),
  }
}
