import type { PackTier } from '../data/packs'
import { ALL_PLAYERS } from '../data/players'
import { pickWeightedPlayer, instantiatePlayer } from './playerPool'
import type { Player } from '../types/player'

export function openPack(pack: PackTier): Player[] {
  const pool = pack.minOvrFloor ? ALL_PLAYERS.filter((p) => p.rating >= pack.minOvrFloor!) : ALL_PLAYERS
  const cards: Player[] = []
  for (let i = 0; i < pack.cardCount; i++) {
    cards.push(instantiatePlayer(pickWeightedPlayer(pool)))
  }
  cards.sort((a, b) => b.rating - a.rating)
  return cards
}
