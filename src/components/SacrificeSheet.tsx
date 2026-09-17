import { useMemo, useState } from 'react'
import type { Player } from '../types/player'
import { useAllPlayers, getBasePlayerById, applyBoosts } from '../data/playerRepo'
import { useCollectionStore } from '../state/collectionStore'
import { useSquadStore } from '../state/squadStore'
import { useUpgradesStore } from '../state/upgradesStore'
import { applyXpGain, xpFromDonor, xpNeededForLevel } from '../lib/xp'
import PlayerRow from './PlayerRow'
import { RARITY_LABEL } from '../types/player'
import { RARITY_STYLE } from '../lib/cardStyles'

interface Props {
  target: Player
  onClose: () => void
}

export default function SacrificeSheet({ target, onClose }: Props) {
  const allPlayers = useAllPlayers()
  // Only pack/transfer-acquired collection players can ever be donors — the
  // base 40-player club roster has no removal mechanism at all, so letting
  // one of those be "sacrificed" would grant XP for free, over and over,
  // without ever actually giving anything up.
  const extraPlayers = useCollectionStore((s) => s.extraPlayers)
  const lineup = useSquadStore((s) => s.lineup)
  const protectedIds = useUpgradesStore((s) => s.protectedIds)
  const boosts = useUpgradesStore((s) => s.boosts)
  const xpMap = useUpgradesStore((s) => s.xp)
  const sacrifice = useUpgradesStore((s) => s.sacrifice)
  const [donorId, setDonorId] = useState<string | null>(null)

  const lineupIds = useMemo(() => new Set(Object.values(lineup).filter(Boolean)), [lineup])

  const eligibleDonors = useMemo(
    () =>
      extraPlayers
        .filter((p) => p.id !== target.id && !lineupIds.has(p.id) && !protectedIds[p.id])
        .map((p) => applyBoosts(p, boosts[p.id]))
        .sort((a, b) => a.rating - b.rating),
    [extraPlayers, target.id, lineupIds, protectedIds, boosts],
  )

  const donor = donorId ? (allPlayers.find((p) => p.id === donorId) ?? null) : null

  const currentXp = xpMap[target.id] ?? 0
  const currentBoosts = boosts[target.id] ?? {}
  const xpNeeded = xpNeededForLevel(target.rating)
  const currentPct = target.rating >= 99 ? 100 : Math.min(100, Math.round((currentXp / xpNeeded) * 100))

  const preview = useMemo(() => {
    if (!donor) return null
    const base = getBasePlayerById(target.id)
    if (!base) return null
    const gain = xpFromDonor(donor)
    const result = applyXpGain(base, currentBoosts, currentXp, gain)
    return { gain, result }
  }, [donor, target.id, currentBoosts, currentXp])

  const confirm = () => {
    if (!donor || !preview) return
    const base = getBasePlayerById(target.id)
    if (!base) return
    sacrifice(donor.id, base, preview.gain)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="no-scrollbar safe-bottom relative max-h-[90%] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-border bg-night-2 px-5 pt-4 pb-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink"
        >
          ✕
        </button>

        {!donor ? (
          <>
            <h2 className="font-display text-lg font-bold text-white">Выберите донора</h2>
            <p className="mt-1 text-xs text-ink-2">
              Игрок будет удалён из коллекции навсегда, а его опыт пойдёт в прокачку {target.name}. Игроки из
              стартового состава и помеченные «Не сдавать» недоступны.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {eligibleDonors.length === 0 && (
                <p className="py-6 text-center text-sm text-ink-2">Нет доступных доноров.</p>
              )}
              {eligibleDonors.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  onClick={() => setDonorId(p.id)}
                  right={
                    <span className="shrink-0 rounded-lg bg-cyan/10 px-2.5 py-1.5 font-display text-xs font-bold text-cyan">
                      +{xpFromDonor(p)} XP
                    </span>
                  }
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-lg font-bold text-white">Подтвердите сдачу игрока</h2>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full border-2 font-display text-sm font-bold text-white ${RARITY_STYLE[donor.rarity].ring}`}
                >
                  {donor.rating}
                </span>
                <span className="max-w-[90px] truncate text-center text-[11px] text-ink">{donor.name}</span>
                <span className="text-[10px] text-ink-2">{RARITY_LABEL[donor.rarity]}</span>
              </div>
              <span className="font-display text-xl text-cyan">→</span>
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-lg font-bold text-gold">+{preview?.gain ?? 0}</span>
                <span className="text-[10px] text-ink-2">XP</span>
              </div>
              <span className="font-display text-xl text-cyan">→</span>
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full border-2 font-display text-sm font-bold text-white ${RARITY_STYLE[target.rarity].ring}`}
                >
                  {target.rating}
                </span>
                <span className="max-w-[90px] truncate text-center text-[11px] text-ink">{target.name}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
              <p className="font-display text-xs font-bold tracking-wide text-ink-2 uppercase">Прогресс прокачки</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-ink">
                <span className="tabular-nums">
                  {currentXp} / {xpNeeded}
                </span>
                <span className="text-ink-2">→</span>
                <span className="font-bold text-cyan tabular-nums">
                  {preview ? `${preview.result.xp} / ${xpNeededForLevel(target.rating + preview.result.levelsGained)}` : '—'}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-gradient-to-r from-ink-2 to-ink-2" style={{ width: `${currentPct}%` }} />
              </div>
              {preview && preview.result.levelsGained > 0 && (
                <p className="mt-2 flex items-center gap-1.5 font-display text-sm font-bold text-gold">
                  ⭐ Рейтинг повысится: {target.rating} → {target.rating + preview.result.levelsGained}
                </p>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDonorId(null)}
                className="flex-1 rounded-xl border border-border bg-surface py-3 font-display text-sm font-semibold text-white"
              >
                Назад
              </button>
              <button
                onClick={confirm}
                className="flex-1 rounded-xl bg-gradient-to-r from-danger to-gold py-3 font-display text-sm font-bold text-night"
              >
                Сдать навсегда
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
