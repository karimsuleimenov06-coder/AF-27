import type { PositionGroup, Rarity } from '../types/player'

interface RarityStyle {
  gradient: string
  ring: string
  glow: string
  text: string
  chipBg: string
}

export const RARITY_STYLE: Record<Rarity, RarityStyle> = {
  common: {
    gradient: 'from-silver-2 via-silver to-silver-2',
    ring: 'ring-silver/50',
    glow: 'shadow-silver/20',
    text: 'text-night',
    chipBg: 'bg-silver/20 text-silver border-silver/40',
  },
  rare: {
    gradient: 'from-emerald/70 via-cyan to-emerald/70',
    ring: 'ring-cyan/55',
    glow: 'shadow-cyan/25',
    text: 'text-night',
    chipBg: 'bg-cyan/20 text-cyan border-cyan/40',
  },
  epic: {
    gradient: 'from-violet via-cyan to-violet',
    ring: 'ring-violet/65',
    glow: 'shadow-violet/35',
    text: 'text-white',
    chipBg: 'bg-violet/20 text-violet border-violet/40',
  },
  legendary: {
    gradient: 'from-night-2 via-gold-2 to-night-2',
    ring: 'ring-gold-2/80',
    glow: 'shadow-gold/60',
    text: 'text-white',
    chipBg: 'bg-night text-gold-2 border-gold-2/60',
  },
  // Promo-exclusive cards (see data/promoCards.ts) get their own distinct
  // "holographic" look — never seen on a pack pull, so it needs to read as
  // clearly different from every rarity a player can actually roll.
  promo: {
    gradient: 'from-cyan via-violet to-danger',
    ring: 'ring-violet/70',
    glow: 'shadow-cyan/50',
    text: 'text-white',
    chipBg: 'bg-violet/20 text-white border-cyan/50',
  },
}

export const POSITION_GROUP_ACCENT: Record<PositionGroup, string> = {
  GK: 'from-cyan to-emerald',
  DEF: 'from-emerald to-cyan',
  MID: 'from-gold to-gold-2',
  ATT: 'from-violet to-cyan',
}
