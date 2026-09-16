import type { PackTier } from '../data/packs'
import { generatePlayer, rollRarity } from './playerGenerator'
import { pickRandomIcon } from '../data/icons'
import type { Player, Rarity } from '../types/player'

const RARITY_RANK: Record<Rarity, number> = { bronze: 0, silver: 1, gold: 2, special: 3, icon: 4 }

export function openPack(pack: PackTier): Player[] {
  const rarities: Rarity[] = []
  for (let i = 0; i < pack.cardCount; i++) rarities.push(rollRarity(pack.odds))

  if (pack.guaranteedMinRarity) {
    const min = RARITY_RANK[pack.guaranteedMinRarity]
    const hasGuarantee = rarities.some((r) => RARITY_RANK[r] >= min)
    if (!hasGuarantee) {
      const eligible = (Object.keys(pack.odds) as Rarity[]).filter((r) => RARITY_RANK[r] >= min)
      const weights = eligible.map((r) => pack.odds[r])
      const total = weights.reduce((a, b) => a + b, 0) || 1
      let roll = Math.random() * total
      let chosen: Rarity = eligible[eligible.length - 1]
      for (let i = 0; i < eligible.length; i++) {
        roll -= weights[i]
        if (roll <= 0) {
          chosen = eligible[i]
          break
        }
      }
      rarities[rarities.length - 1] = chosen
    }
  }

  rarities.sort((a, b) => RARITY_RANK[a] - RARITY_RANK[b])
  return rarities.map((r) => (r === 'icon' ? pickRandomIcon() : generatePlayer(r)))
}
