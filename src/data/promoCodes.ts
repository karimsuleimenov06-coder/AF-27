import type { Player } from '../types/player'
import { BETA_PROMO_PLAYER } from './promoCards'

export type PromoEffect = { type: 'gems'; amount: number } | { type: 'player'; player: Player }

/** Codes are matched case-insensitively (see promoStore) — keys here are
 * already the canonical uppercase form. */
export const PROMO_CODES: Record<string, PromoEffect> = {
  AFK27: { type: 'gems', amount: 10 },
  BETA: { type: 'player', player: BETA_PROMO_PLAYER },
}
