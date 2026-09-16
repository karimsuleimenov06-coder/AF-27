import type { PositionGroup, Rarity } from '../types/player'

interface RarityStyle {
  gradient: string
  ring: string
  glow: string
  text: string
  chipBg: string
}

export const RARITY_STYLE: Record<Rarity, RarityStyle> = {
  bronze: {
    gradient: 'from-bronze-2 via-bronze to-bronze-2',
    ring: 'ring-bronze/50',
    glow: 'shadow-bronze/20',
    text: 'text-night',
    chipBg: 'bg-bronze/20 text-bronze border-bronze/40',
  },
  silver: {
    gradient: 'from-silver-2 via-silver to-silver-2',
    ring: 'ring-silver/50',
    glow: 'shadow-silver/20',
    text: 'text-night',
    chipBg: 'bg-silver/20 text-silver border-silver/40',
  },
  gold: {
    gradient: 'from-gold-2 via-gold to-gold-2',
    ring: 'ring-gold/60',
    glow: 'shadow-gold/30',
    text: 'text-night',
    chipBg: 'bg-gold/20 text-gold border-gold/40',
  },
  special: {
    gradient: 'from-cyan via-violet to-cyan',
    ring: 'ring-cyan/60',
    glow: 'shadow-violet/40',
    text: 'text-white',
    chipBg: 'bg-violet/20 text-cyan border-cyan/40',
  },
}

export const POSITION_GROUP_ACCENT: Record<PositionGroup, string> = {
  GK: 'from-cyan to-emerald',
  DEF: 'from-emerald to-cyan',
  MID: 'from-gold to-gold-2',
  ATT: 'from-violet to-cyan',
}
