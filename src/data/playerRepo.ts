import { calculateOverall, calculateValue, getRarity, type Player } from '../types/player'
import { ALL_PLAYERS, STARTING_ROSTER_IDS } from './players'
import { useCollectionStore } from '../state/collectionStore'
import { useUpgradesStore, type StatBoosts } from '../state/upgradesStore'

/** The starting-roster subset of the AF27 100-player database — owned for
 * free so a match is always playable. Every other AF27 player only enters a
 * collection via a pack pull or a transfer-market purchase. */
const STARTING_PLAYERS: Player[] = STARTING_ROSTER_IDS.map((id) => ALL_PLAYERS.find((p) => p.id === id)!).filter(Boolean)

export function getAllBasePlayers(): Player[] {
  return [...STARTING_PLAYERS, ...useCollectionStore.getState().extraPlayers]
}

export function getBasePlayerById(id: string): Player | undefined {
  return getAllBasePlayers().find((p) => p.id === id)
}

export function applyBoosts(player: Player, boosts: StatBoosts | undefined): Player {
  if (!boosts) return player
  const stats = { ...player.stats }
  for (const key of Object.keys(boosts) as (keyof typeof stats)[]) {
    const add = boosts[key] ?? 0
    stats[key] = Math.min(99, stats[key] + add)
  }
  const rating = calculateOverall(player.position, stats)
  // Promo cards are a fixed, hand-placed tier, not derived from rating
  // bands — training one further must never demote it back to a regular
  // rarity. Every other rarity (common/rare/epic/legendary) is purely
  // OVR-band-derived, so it's expected — and fine — for a heavily trained
  // player to climb into a higher rarity tier.
  const rarity = player.rarity === 'promo' ? 'promo' : getRarity(rating)
  return {
    ...player,
    stats,
    rating,
    rarity,
    value: calculateValue(rating, rarity),
  }
}

export function getEffectivePlayer(id: string): Player | undefined {
  const base = getBasePlayerById(id)
  if (!base) return undefined
  const boosts = useUpgradesStore.getState().boosts[id]
  return applyBoosts(base, boosts)
}

export function getAllEffectivePlayers(): Player[] {
  const boosts = useUpgradesStore.getState().boosts
  return getAllBasePlayers().map((p) => applyBoosts(p, boosts[p.id]))
}

export function useAllPlayers(): Player[] {
  const extraPlayers = useCollectionStore((s) => s.extraPlayers)
  const boosts = useUpgradesStore((s) => s.boosts)
  const base = [...STARTING_PLAYERS, ...extraPlayers]
  return base.map((p) => applyBoosts(p, boosts[p.id]))
}

export function useEffectivePlayer(id: string | null): Player | null {
  const extraPlayers = useCollectionStore((s) => s.extraPlayers)
  const boosts = useUpgradesStore((s) => s.boosts)
  if (!id) return null
  const base = STARTING_PLAYERS.find((p) => p.id === id) ?? extraPlayers.find((p) => p.id === id)
  if (!base) return null
  return applyBoosts(base, boosts[id])
}
