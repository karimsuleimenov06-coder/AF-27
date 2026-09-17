import { ALL_PLAYERS, DROP_WEIGHTS } from '../data/players'
import type { Player } from '../types/player'

/** Picks one player from `pool` (default: the full 100) using AF27's
 * DROP_WEIGHTS — the exact per-player probability curve, not a flat
 * random choice. Callers that restrict `pool` (e.g. a pack's OVR floor)
 * naturally renormalize since only the picked weights are compared. */
export function pickWeightedPlayer(pool: Player[] = ALL_PLAYERS): Player {
  const total = pool.reduce((a, p) => a + (DROP_WEIGHTS[p.id] ?? 0), 0)
  let roll = Math.random() * total
  for (const p of pool) {
    roll -= DROP_WEIGHTS[p.id] ?? 0
    if (roll <= 0) return p
  }
  return pool[pool.length - 1]
}

let instanceSeq = 0

/** A pack pull or market listing needs its own unique id per copy — the
 * same AF27 player can be owned multiple times, each a distinct card
 * instance, exactly like any other gacha collection. */
export function instantiatePlayer(base: Player): Player {
  instanceSeq += 1
  return { ...base, id: `${base.id}-${Date.now().toString(36)}-${instanceSeq}-${Math.random().toString(36).slice(2, 6)}` }
}
