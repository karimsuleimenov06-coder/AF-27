import type { Player } from '../types/player'
import { POSITION_GROUP } from '../types/player'
import { RARITY_STYLE, POSITION_GROUP_ACCENT } from '../lib/cardStyles'

interface Props {
  player: Player
  size?: 'sm' | 'lg'
  onClick?: () => void
}

const FOOT_LABEL: Record<Player['foot'], string> = { left: 'Л', right: 'П' }

export default function PlayerCard({ player, size = 'sm', onClick }: Props) {
  const rarityStyle = RARITY_STYLE[player.rarity]
  const positionAccent = POSITION_GROUP_ACCENT[POSITION_GROUP[player.position]]
  const lg = size === 'lg'

  const statEntries: [string, number][] = [
    ['PAC', player.stats.pace],
    ['SHO', player.stats.shooting],
    ['PAS', player.stats.passing],
    ['DRI', player.stats.dribbling],
    ['DEF', player.stats.defending],
    ['PHY', player.stats.physical],
  ]

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left ring-1 shadow-lg transition-transform active:scale-[0.97] ${rarityStyle.ring} ${rarityStyle.glow} ${lg ? 'w-full max-w-[280px]' : 'w-full'}`}
    >
      <div
        className={`relative bg-gradient-to-br ${rarityStyle.gradient} ${lg ? 'pt-4 pb-8' : 'pt-2.5 pb-6'} px-3`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px, transparent 14px)',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${rarityStyle.gradient} -z-10`} />
        {player.rarity === 'promo' && (
          <span
            className={`absolute top-1.5 right-1.5 rounded-full border border-white/40 bg-black/30 font-display font-bold tracking-wider text-white uppercase ${
              lg ? 'px-2.5 py-1 text-[10px]' : 'px-1.5 py-0.5 text-[8px]'
            }`}
          >
            Промо
          </span>
        )}

        <div className="flex items-start justify-between">
          <div className={rarityStyle.text}>
            <p className={`font-display leading-none font-bold ${lg ? 'text-4xl' : 'text-2xl'}`}>{player.rating}</p>
            <p className={`font-display leading-none font-semibold opacity-80 ${lg ? 'mt-1 text-sm' : 'mt-0.5 text-xs'}`}>
              {player.position}
            </p>
          </div>
          <span
            className={`flex items-center justify-center rounded-full border border-black/20 bg-black/15 font-display font-bold ${rarityStyle.text} ${lg ? 'h-7 w-7 text-xs' : 'h-5 w-5 text-[10px]'}`}
          >
            {FOOT_LABEL[player.foot]}
          </span>
        </div>
      </div>

      <div className={`flex justify-center ${lg ? '-mt-8' : '-mt-6'}`}>
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border-4 border-surface bg-gradient-to-br font-display font-bold text-night ${positionAccent} ${lg ? 'h-16 w-16 text-xl' : 'h-11 w-11 text-sm'}`}
        >
          {player.name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)}
        </span>
      </div>

      <div className={`flex flex-1 flex-col items-center gap-2 px-3 ${lg ? 'pt-2 pb-4' : 'pt-1 pb-3'}`}>
        <p className={`truncate text-center font-display font-semibold text-white ${lg ? 'text-base' : 'text-[13px]'}`}>
          {player.name}
        </p>

        <div className={`grid w-full grid-cols-3 gap-x-1 gap-y-1.5 border-t border-border/60 ${lg ? 'pt-3' : 'pt-2'}`}>
          {statEntries.map(([label, value]) => (
            <div key={label} className="flex flex-col items-center">
              <span className={`font-display font-bold text-white tabular-nums ${lg ? 'text-sm' : 'text-xs'}`}>{value}</span>
              <span className="text-[9px] font-semibold tracking-wide text-ink-2 uppercase">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}
