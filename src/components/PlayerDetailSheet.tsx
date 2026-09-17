import { useState } from 'react'
import type { Player } from '../types/player'
import { POSITION_LABEL, RARITY_LABEL } from '../types/player'
import { RARITY_STYLE } from '../lib/cardStyles'
import { xpNeededForLevel } from '../lib/xp'
import { useUpgradesStore } from '../state/upgradesStore'
import { useSquadStore } from '../state/squadStore'
import PlayerCard from './PlayerCard'
import SacrificeSheet from './SacrificeSheet'

interface Props {
  player: Player | null
  onClose: () => void
}

const STAT_LABELS: [key: keyof Player['stats'], label: string][] = [
  ['pace', 'Скорость'],
  ['shooting', 'Удар'],
  ['passing', 'Пас'],
  ['dribbling', 'Дриблинг'],
  ['defending', 'Защита'],
  ['physical', 'Физика'],
]

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-ink">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan to-violet" style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right font-display text-sm font-bold text-white tabular-nums">{value}</span>
    </div>
  )
}

export default function PlayerDetailSheet({ player, onClose }: Props) {
  const xpMap = useUpgradesStore((s) => s.xp)
  const protectedIds = useUpgradesStore((s) => s.protectedIds)
  const toggleProtected = useUpgradesStore((s) => s.toggleProtected)
  const lineup = useSquadStore((s) => s.lineup)
  const [sacrificeOpen, setSacrificeOpen] = useState(false)

  if (!player) return null
  const rarityStyle = RARITY_STYLE[player.rarity]
  const xp = xpMap[player.id] ?? 0
  const xpNeeded = xpNeededForLevel(player.rating)
  const xpPct = player.rating >= 99 ? 100 : Math.min(100, Math.round((xp / xpNeeded) * 100))
  const isProtected = Boolean(protectedIds[player.id])
  const isInLineup = Object.values(lineup).includes(player.id)

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
          {STAT_LABELS.map(([key, label]) => (
            <StatBar key={key} label={label} value={player.stats[key]} />
          ))}
          <div className="my-1 border-t border-border/60" />
          <StatBar label="Выносливость" value={player.stamina} />
        </div>

        <div className="mt-3 rounded-2xl border border-cyan/30 bg-cyan/5 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs font-bold tracking-wide text-cyan uppercase">Прокачка</p>
            <p className="font-display text-xs font-bold text-white tabular-nums">
              {player.rating >= 99 ? 'Макс.' : `${xp} / ${xpNeeded} XP`}
            </p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan to-gold" style={{ width: `${xpPct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-2">
            {player.rating >= 99
              ? 'Игрок достиг максимального рейтинга.'
              : `Ещё ${xpNeeded - xp} XP до рейтинга ${player.rating + 1}`}
          </p>
          <button
            onClick={() => setSacrificeOpen(true)}
            disabled={player.rating >= 99}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-cyan to-violet py-2.5 font-display text-sm font-bold text-night disabled:opacity-40"
          >
            Сдать игрока за XP
          </button>
        </div>

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

        <button
          onClick={() => toggleProtected(player.id)}
          className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 font-display text-xs font-bold ${
            isProtected ? 'border-danger/50 bg-danger/10 text-danger' : 'border-border bg-surface text-ink'
          }`}
        >
          {isProtected ? '🔒 Не сдавать — включено' : '🔓 Пометить «Не сдавать»'}
        </button>
        {isInLineup && (
          <p className="mt-2 text-center text-[11px] text-ink-2">Игрок в стартовом составе — его нельзя сдать в жертву.</p>
        )}
      </div>

      {sacrificeOpen && <SacrificeSheet target={player} onClose={() => setSacrificeOpen(false)} />}
    </div>
  )
}
