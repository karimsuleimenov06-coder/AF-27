import type { ReactNode } from 'react'
import type { Player } from '../types/player'
import { POSITION_LABEL, RARITY_LABEL } from '../types/player'
import { RARITY_STYLE } from '../lib/cardStyles'
import { useAppStore } from '../state/appStore'
import { useUpgradesStore, UPGRADE_COST_COINS, MAX_BOOST_PER_STAT, type StatBoosts } from '../state/upgradesStore'
import PlayerCard from './PlayerCard'
import { CoinIcon } from './Icons'

interface Props {
  player: Player | null
  onClose: () => void
}

const EMPTY_BOOSTS: StatBoosts = {}

const STAT_LABELS: [key: keyof Player['stats'], label: string][] = [
  ['pace', 'Скорость'],
  ['shooting', 'Удар'],
  ['passing', 'Пас'],
  ['dribbling', 'Дриблинг'],
  ['defending', 'Защита'],
  ['physical', 'Физика'],
]

function StatBar({ label, value, upgrade }: { label: string; value: number; upgrade?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-ink">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet" style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right font-display text-sm font-bold text-white tabular-nums">{value}</span>
      {upgrade}
    </div>
  )
}

export default function PlayerDetailSheet({ player, onClose }: Props) {
  const coins = useAppStore((s) => s.profile.coins)
  const spendCoins = useAppStore((s) => s.spendCoins)
  const allBoosts = useUpgradesStore((s) => s.boosts)
  const boostStat = useUpgradesStore((s) => s.boostStat)

  if (!player) return null
  const rarityStyle = RARITY_STYLE[player.rarity]
  const boosts = allBoosts[player.id] ?? EMPTY_BOOSTS

  const handleUpgrade = (key: keyof Player['stats']) => {
    if (!spendCoins(UPGRADE_COST_COINS)) return
    boostStat(player.id, key, 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="no-scrollbar safe-bottom relative max-h-[88%] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-border bg-night-2 px-5 pt-4 pb-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink"
        >
          ✕
        </button>

        <div className="flex flex-col items-center gap-4 pt-2">
          <PlayerCard player={player} size="lg" />

          <span className={`rounded-full border px-3 py-1 font-display text-xs font-bold tracking-wide uppercase ${rarityStyle.chipBg}`}>
            {RARITY_LABEL[player.rarity]}
          </span>

          <p className="text-center text-sm text-ink">{POSITION_LABEL[player.position]}</p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4">
          {STAT_LABELS.map(([key, label]) => {
            const boosted = boosts[key] ?? 0
            const maxed = boosted >= MAX_BOOST_PER_STAT || player.stats[key] >= 99
            return (
              <StatBar
                key={key}
                label={label}
                value={player.stats[key]}
                upgrade={
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={maxed || coins < UPGRADE_COST_COINS}
                    aria-label={`Улучшить ${label}`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan/40 bg-cyan/10 text-xs font-bold text-cyan disabled:border-border disabled:bg-surface-2 disabled:text-ink-2"
                  >
                    +
                  </button>
                }
              />
            )
          })}
          <div className="my-1 border-t border-border/60" />
          <StatBar label="Выносливость" value={player.stamina} />
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-2">
          Тренировка: <CoinIcon className="h-3.5 w-3.5 text-gold" /> {UPGRADE_COST_COINS} за +1 к характеристике
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border bg-surface p-3 text-center">
            <p className="text-xs text-ink-2">Рабочая нога</p>
            <p className="mt-1 font-display text-base font-bold text-white">{player.foot === 'left' ? 'Левая' : 'Правая'}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3 text-center">
            <p className="text-xs text-ink-2">Стоимость</p>
            <p className="mt-1 font-display text-base font-bold text-gold">{player.value.toLocaleString('ru-RU')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
