import type { ReactNode } from 'react'
import type { Player } from '../types/player'
import { POSITION_GROUP } from '../types/player'
import { RARITY_STYLE, POSITION_GROUP_ACCENT } from '../lib/cardStyles'

interface Props {
  player: Player
  right?: ReactNode
  onClick?: () => void
  highlighted?: boolean
}

export default function PlayerRow({ player, right, onClick, highlighted }: Props) {
  const accent = POSITION_GROUP_ACCENT[POSITION_GROUP[player.position]]
  const rarityStyle = RARITY_STYLE[player.rarity]

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        highlighted ? 'border-cyan bg-cyan/10' : 'border-border bg-surface'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display text-xs font-bold text-night ${accent}`}>
        {player.name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-semibold text-white">{player.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-2">
          <span>{player.position}</span>
          <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${rarityStyle.chipBg}`}>{player.rating}</span>
        </span>
      </span>
      {right}
    </button>
  )
}
