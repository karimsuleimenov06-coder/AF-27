import { calculateOverall, calculateValue, getRarity, type Player } from '../types/player'
import { CLUB_PLAYERS } from './players'
import { useCollectionStore } from '../state/collectionStore'
import { useUpgradesStore, type StatBoosts } from '../state/upgradesStore'

export function getAllBasePlayers(): Player[] {
  return [...CLUB_PLAYERS, ...useCollectionStore.getState().extraPlayers]
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
  return {
    ...player,
    stats,
    rating,
    // Icons and promo cards are fixed, hand-placed tiers, not derived from
    // rating bands — training one further must never demote it back to a
    // regular rarity.
    rarity: player.rarity === 'icon' || player.rarity === 'promo' ? player.rarity : getRarity(rating),
    value: calculateValue(rating),
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
  const base = [...CLUB_PLAYERS, ...extraPlayers]
  return base.map((p) => applyBoosts(p, boosts[p.id]))
}

export function useEffectivePlayer(id: string | null): Player | null {
  const extraPlayers = useCollectionStore((s) => s.extraPlayers)
  const boosts = useUpgradesStore((s) => s.boosts)
  if (!id) return null
  const base = CLUB_PLAYERS.find((p) => p.id === id) ?? extraPlayers.find((p) => p.id === id)
  if (!base) return null
  return applyBoosts(base, boosts[id])
}
