export type Currency = 'coins' | 'gems'

export interface PackTier {
  id: string
  name: string
  description: string
  cardCount: number
  cost: { currency: Currency; amount: number }
  /** If set, a pull below this OVR re-rolls (still from AF27's global
   * DROP_WEIGHTS curve, just restricted to players at or above the floor)
   * — this is the only thing that differs between pack tiers. The
   * per-player probability curve itself never changes between packs. */
  minOvrFloor?: number
  accent: string
}

// Costs are calibrated so a pack's coin/gem price sits above the expected
// resale value of its contents (see SELL_RATE in lib/economy.ts) —
// opening and immediately reselling should never be profitable.
export const PACKS: PackTier[] = [
  {
    id: 'bronze',
    name: 'Обычный пак',
    description: 'Доступный набор для пополнения состава',
    cardCount: 2,
    cost: { currency: 'coins', amount: 900 },
    accent: 'from-silver-2 to-silver',
  },
  {
    id: 'silver',
    name: 'Редкий пак',
    description: 'Повышенный шанс на игроков высокого уровня',
    cardCount: 3,
    cost: { currency: 'coins', amount: 5500 },
    minOvrFloor: 60,
    accent: 'from-emerald to-cyan',
  },
  {
    id: 'gold',
    name: 'Премиальный пак',
    description: 'Гарантированно сильный состав и шанс на Legendary',
    cardCount: 5,
    cost: { currency: 'gems', amount: 50 },
    minOvrFloor: 75,
    accent: 'from-violet to-cyan',
  },
  {
    id: 'event',
    name: 'Astra Event',
    description: 'Лимитированный пак с повышенным шансом на Legendary',
    cardCount: 5,
    cost: { currency: 'gems', amount: 140 },
    minOvrFloor: 85,
    accent: 'from-gold to-gold-2',
  },
]
