import { calculateOverall, type Player, type PlayerStats, type Position, type Rarity } from '../types/player'
import { POSITION_GROUP } from '../types/player'
import type { StatBoosts } from '../state/upgradesStore'

const STAT_ORDER: Record<'GK' | 'DEF' | 'MID' | 'ATT', (keyof PlayerStats)[]> = {
  GK: ['defending', 'physical', 'passing', 'dribbling', 'pace', 'shooting'],
  DEF: ['defending', 'physical', 'pace', 'passing', 'dribbling', 'shooting'],
  MID: ['passing', 'dribbling', 'pace', 'shooting', 'defending', 'physical'],
  ATT: ['shooting', 'pace', 'dribbling', 'passing', 'physical', 'defending'],
}

/** XP required to go from `rating` to `rating + 1`. Grows with rating —
 * pushing a 90-rated player up another point costs meaningfully more than
 * pushing a 60-rated one, so late-game upgrades stay a real decision rather
 * than a formality. */
export function xpNeededForLevel(rating: number): number {
  return Math.round(1000 * Math.pow(1.03, rating - 60))
}

const RARITY_DONOR_BONUS: Record<Rarity, number> = {
  common: 0,
  rare: 70,
  epic: 220,
  legendary: 650,
  promo: 500,
}

/** How much XP feeding `donor` into another player's progress is worth.
 * Scales with the donor's OVR, rarity, and market value — sacrificing an
 * Epic or Legendary card is a real sacrifice, so it pays off proportionally. */
export function xpFromDonor(donor: Player): number {
  return Math.round(donor.rating * 8 + RARITY_DONOR_BONUS[donor.rarity] + donor.value * 0.02)
}

function mergedStats(base: PlayerStats, boosts: StatBoosts): PlayerStats {
  const out = { ...base }
  for (const key of Object.keys(boosts) as (keyof PlayerStats)[]) {
    out[key] = Math.min(99, out[key] + (boosts[key] ?? 0))
  }
  return out
}

/** Applies enough of a stat bump (to the position's most important stats
 * first, mirroring how a real player would actually train) to raise the
 * computed overall by exactly one point. */
function bumpOneRating(position: Position, baseStats: PlayerStats, boosts: StatBoosts): StatBoosts {
  const order = STAT_ORDER[POSITION_GROUP[position]]
  const startRating = calculateOverall(position, mergedStats(baseStats, boosts))
  const next = { ...boosts }
  let guard = 0
  while (calculateOverall(position, mergedStats(baseStats, next)) < startRating + 1 && guard < 20) {
    let bumped = false
    for (const key of order) {
      const current = mergedStats(baseStats, next)[key]
      if (current < 99) {
        next[key] = (next[key] ?? 0) + 1
        bumped = true
        break
      }
    }
    if (!bumped) break // every stat maxed at 99 — nothing left to raise
    guard += 1
  }
  return next
}

export interface LevelUpResult {
  boosts: StatBoosts
  xp: number
  levelsGained: number
}

/** Given a player's current boosts + XP progress and a fresh XP grant,
 * applies as many level-ups as the XP affords (a huge donor grant can cross
 * more than one threshold at once), carrying the remainder forward. */
export function applyXpGain(player: Player, currentBoosts: StatBoosts, currentXp: number, xpGain: number): LevelUpResult {
  let boosts = { ...currentBoosts }
  let xp = currentXp + xpGain
  let levelsGained = 0
  const baseRating = () => calculateOverall(player.position, mergedStats(player.stats, boosts))

  while (true) {
    const rating = baseRating()
    if (rating >= 99) break
    const needed = xpNeededForLevel(rating)
    if (xp < needed) break
    xp -= needed
    boosts = bumpOneRating(player.position, player.stats, boosts)
    levelsGained += 1
  }

  return { boosts, xp, levelsGained }
}
