import { useMemo, useState } from 'react'
import { useAllPlayers } from '../data/playerRepo'
import { useUpgradesStore } from '../state/upgradesStore'
import { xpNeededForLevel } from '../lib/xp'
import PlayerCard from '../components/PlayerCard'
import PlayerDetailSheet from '../components/PlayerDetailSheet'

export default function UpgradesScreen() {
  const players = useAllPlayers()
  const xpMap = useUpgradesStore((s) => s.xp)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sorted = useMemo(() => [...players].sort((a, b) => b.rating - a.rating), [players])
  const selected = players.find((p) => p.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
      <div className="flex items-center justify-between px-1">
        <h1 className="font-display text-xl font-bold text-white">Улучшение</h1>
        <span className="font-display text-sm font-semibold text-ink-2">{players.length} игроков</span>
      </div>
      <p className="rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-ink">
        Выберите игрока и сдайте ненужного из коллекции в жертву, чтобы получить XP и поднять его рейтинг. Игроки из
        стартового состава и помеченные «Не сдавать» защищены от случайной сдачи.
      </p>

      <div className="grid grid-cols-4 gap-3">
        {sorted.map((player) => {
          const xp = xpMap[player.id] ?? 0
          const needed = xpNeededForLevel(player.rating)
          const pct = player.rating >= 99 ? 100 : Math.min(100, Math.round((xp / needed) * 100))
          return (
            <div key={player.id} className="flex flex-col gap-1">
              <PlayerCard player={player} onClick={() => setSelectedId(player.id)} />
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan to-gold" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <PlayerDetailSheet player={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
