import type { Rarity } from '../types/player'

export type Currency = 'coins' | 'gems'

export interface PackTier {
  id: string
  name: string
  description: string
  cardCount: number
  cost: { currency: Currency; amount: number }
  odds: Record<Rarity, number>
  guaranteedMinRarity?: Rarity
  accent: string
}

// Odds and prices are calibrated so a pack's coin/gem cost sits above the
// expected resale value of its contents (see SELL_RATE in lib/economy.ts) —
// opening and immediately reselling should never be profitable. Rarer tiers
// still skew toward better pulls, they just cost accordingly more.
export const PACKS: PackTier[] = [
  {
    id: 'bronze',
    name: 'Обычный пак',
    description: 'Доступный набор для пополнения состава',
    cardCount: 2,
    cost: { currency: 'coins', amount: 900 },
    odds: { bronze: 0.88, silver: 0.11, gold: 0.009, special: 0.001, icon: 0 },
    accent: 'from-bronze-2 to-bronze',
  },
  {
    id: 'silver',
    name: 'Редкий пак',
    description: 'Повышенный шанс серебряных и золотых карточек',
    cardCount: 3,
    cost: { currency: 'coins', amount: 5500 },
    odds: { bronze: 0.4, silver: 0.45, gold: 0.13, special: 0.02, icon: 0 },
    guaranteedMinRarity: 'silver',
    accent: 'from-silver-2 to-silver',
  },
  {
    id: 'gold',
    name: 'Премиальный пак',
    description: 'Гарантированная золотая карточка и шанс на Icon',
    cardCount: 5,
    cost: { currency: 'gems', amount: 50 },
    // 0.6% each for all 4 Icons (see data/icons.ts) = 2.4% combined, shaved
    // out of the Astra-tier slice rather than stacked on top.
    odds: { bronze: 0.08, silver: 0.32, gold: 0.5, special: 0.076, icon: 0.024 },
    guaranteedMinRarity: 'gold',
    accent: 'from-gold to-gold-2',
  },
  {
    id: 'event',
    name: 'Astra Event',
    description: 'Лимитированный пак с гарантированной Astra-карточкой и шансом на Icon',
    cardCount: 5,
    cost: { currency: 'gems', amount: 140 },
    odds: { bronze: 0, silver: 0.12, gold: 0.53, special: 0.326, icon: 0.024 },
    guaranteedMinRarity: 'special',
    accent: 'from-cyan via-violet to-cyan',
  },
]
