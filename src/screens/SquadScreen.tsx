import { useMemo, useState } from 'react'
import { useAllPlayers } from '../data/playerRepo'
import { FORMATIONS, FORMATION_IDS } from '../data/formations'
import { POSITION_GROUP, POSITION_GROUP_LABEL, type Player, type PositionGroup } from '../types/player'
import PlayerCard from '../components/PlayerCard'
import PlayerDetailSheet from '../components/PlayerDetailSheet'
import PlayerRow from '../components/PlayerRow'
import FormationPitch from '../components/FormationPitch'
import PlayerPickerSheet from '../components/PlayerPickerSheet'
import { getBenchPlayerIds, useSquadStore } from '../state/squadStore'

const FILTERS: { value: PositionGroup | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: 'GK', label: POSITION_GROUP_LABEL.GK },
  { value: 'DEF', label: POSITION_GROUP_LABEL.DEF },
  { value: 'MID', label: POSITION_GROUP_LABEL.MID },
  { value: 'ATT', label: POSITION_GROUP_LABEL.ATT },
]

function PitchTab({ players }: { players: Player[] }) {
  const { formationId, lineup, setFormation, assignPlayer } = useSquadStore()
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null)

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const slots = FORMATIONS[formationId]
  const activeSlot = slots.find((s) => s.id === activeSlotId) ?? null
  const bench = getBenchPlayerIds(lineup)
    .map((id) => byId.get(id))
    .filter((p): p is Player => Boolean(p))
  const avgRating = Math.round(
    slots.reduce((sum, s) => sum + (lineup[s.id] ? (byId.get(lineup[s.id]!)?.rating ?? 0) : 0), 0) / slots.length,
  )

  const detailPlayer = detailPlayerId ? (byId.get(detailPlayerId) ?? null) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-xs text-ink-2">Средний рейтинг состава</p>
          <p className="font-display text-2xl font-bold text-white">{avgRating}</p>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FORMATION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setFormation(id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-display text-sm font-semibold transition-colors ${
                formationId === id ? 'border-cyan bg-cyan/15 text-cyan' : 'border-border bg-surface text-ink'
              }`}
            >
              {id}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-[240px] shrink-0">
          <FormationPitch slots={slots} lineup={lineup} players={players} onSlotClick={setActiveSlotId} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="px-1 pb-2 font-display text-sm font-semibold tracking-wide text-ink-2 uppercase">
            Запасные ({bench.length})
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {bench.map((player) => (
              <PlayerRow key={player.id} player={player} onClick={() => setDetailPlayerId(player.id)} />
            ))}
          </div>
        </div>
      </div>

      <PlayerPickerSheet
        slot={activeSlot}
        currentPlayerId={activeSlot ? lineup[activeSlot.id] : null}
        allPlayers={players}
        onPick={(playerId) => {
          if (activeSlotId) assignPlayer(activeSlotId, playerId)
          setActiveSlotId(null)
        }}
        onClose={() => setActiveSlotId(null)}
      />
      <PlayerDetailSheet player={detailPlayer} onClose={() => setDetailPlayerId(null)} />
    </div>
  )
}

function CardsTab({ players }: { players: Player[] }) {
  const [filter, setFilter] = useState<PositionGroup | 'ALL'>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.rating - a.rating)
    if (filter === 'ALL') return sorted
    return sorted.filter((p) => POSITION_GROUP[p.position] === filter)
  }, [filter, players])

  const selectedPlayer = players.find((p) => p.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 font-display text-sm font-semibold transition-colors ${
              filter === f.value ? 'border-cyan bg-cyan/15 text-cyan' : 'border-border bg-surface text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {filtered.map((player) => (
          <PlayerCard key={player.id} player={player} onClick={() => setSelectedId(player.id)} />
        ))}
      </div>

      <PlayerDetailSheet player={selectedPlayer} onClose={() => setSelectedId(null)} />
    </div>
  )
}

export default function SquadScreen() {
  const [tab, setTab] = useState<'pitch' | 'cards'>('pitch')
  const players = useAllPlayers()

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
      <div className="flex items-center justify-between px-1">
        <h1 className="font-display text-xl font-bold text-white">Состав</h1>
        <span className="font-display text-sm font-semibold text-ink-2">FC Astra · {players.length} игроков</span>
      </div>

      <div className="flex rounded-xl border border-border bg-surface p-1">
        <button
          onClick={() => setTab('pitch')}
          className={`flex-1 rounded-lg py-2 font-display text-sm font-semibold transition-colors ${
            tab === 'pitch' ? 'bg-cyan/15 text-cyan' : 'text-ink'
          }`}
        >
          Поле
        </button>
        <button
          onClick={() => setTab('cards')}
          className={`flex-1 rounded-lg py-2 font-display text-sm font-semibold transition-colors ${
            tab === 'cards' ? 'bg-cyan/15 text-cyan' : 'text-ink'
          }`}
        >
          Игроки
        </button>
      </div>

      {tab === 'pitch' ? <PitchTab players={players} /> : <CardsTab players={players} />}
    </div>
  )
}
