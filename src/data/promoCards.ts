import { calculateOverall, calculateValue, type Player } from '../types/player'

/**
 * Cards redeemable only through a promo code — never rolled by a pack,
 * never on the transfer market, and not part of the standard 40-player
 * club roster. Same real-athlete-likeness reasoning as data/icons.ts: this
 * is a publicly deployed product, so promo cards here are original
 * characters rather than real, identifiable professional footballers.
 */

const BETA_STATS = { pace: 97, shooting: 85, passing: 78, dribbling: 92, defending: 36, physical: 78 }

export const BETA_PROMO_PLAYER: Player = (() => {
  const rating = calculateOverall('ST', BETA_STATS)
  return {
    id: 'promo-beta-striker',
    name: 'Ксавье Ленуар',
    position: 'ST',
    stats: BETA_STATS,
    stamina: 88,
    foot: 'right',
    rating,
    rarity: 'promo',
    value: calculateValue(rating),
  }
})()
