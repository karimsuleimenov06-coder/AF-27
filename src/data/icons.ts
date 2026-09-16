import { calculateOverall, calculateValue, type Foot, type Player, type PlayerStats, type Position } from '../types/player'

/**
 * The "Icon" tier: a small, fixed set of hand-placed legendary players
 * rather than the usual procedurally generated roster (see
 * lib/playerGenerator.ts). These are original characters — not real
 * athletes — since using a real, identifiable professional player's name
 * and likeness inside a pack/rarity system is exactly the kind of use that
 * requires a paid image-rights licence in real life (it's why EA pays
 * FIFPro and every featured player individually for FC/FIFA). Rating is
 * still computed through the same calculateOverall formula as every other
 * player, just with hand-tuned stats aimed at landing on 94.
 */

function makeIcon(input: {
  id: string
  name: string
  position: Position
  stats: PlayerStats
  stamina: number
  foot: Foot
}): Player {
  const rating = calculateOverall(input.position, input.stats)
  return {
    id: input.id,
    name: input.name,
    position: input.position,
    stats: input.stats,
    stamina: input.stamina,
    foot: input.foot,
    rating,
    rarity: 'icon',
    value: calculateValue(rating),
  }
}

export const ICON_PLAYERS: Player[] = [
  makeIcon({
    id: 'icon-kazama',
    name: 'Рион Казама',
    position: 'ST',
    foot: 'right',
    stamina: 90,
    stats: { pace: 98, shooting: 97, passing: 85, dribbling: 95, defending: 30, physical: 90 },
  }),
  makeIcon({
    id: 'icon-vasconcelos',
    name: 'Адриано Васконселос',
    position: 'CAM',
    foot: 'left',
    stamina: 90,
    stats: { pace: 95, shooting: 96, passing: 99, dribbling: 99, defending: 75, physical: 85 },
  }),
  makeIcon({
    id: 'icon-belmiro',
    name: 'Дуарте Белмиро',
    position: 'ST',
    foot: 'right',
    stamina: 85,
    stats: { pace: 92, shooting: 99, passing: 88, dribbling: 93, defending: 35, physical: 97 },
  }),
  makeIcon({
    id: 'icon-andrade',
    name: 'Нило Андраде',
    position: 'RW',
    foot: 'left',
    stamina: 88,
    stats: { pace: 99, shooting: 96, passing: 85, dribbling: 99, defending: 22, physical: 86 },
  }),
]

export function pickRandomIcon(): Player {
  return ICON_PLAYERS[Math.floor(Math.random() * ICON_PLAYERS.length)]
}
