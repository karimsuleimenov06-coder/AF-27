import { useMemo } from 'react'
import type { FormationSlot } from '../data/formations'
import { POSITION_GROUP, type Player } from '../types/player'
import PlayerRow from './PlayerRow'

interface Props {
  slot: FormationSlot | null
  currentPlayerId: string | null
  allPlayers: Player[]
  onPick: (playerId: string) => void
  onClose: () => void
}

export default function PlayerPickerSheet({ slot, currentPlayerId, allPlayers, onPick, onClose }: Props) {
  const players = useMemo(() => {
    if (!slot) return []
    return [...allPlayers].sort((a, b) => {
      const aMatch = POSITION_GROUP[a.position] === slot.group ? 1 : 0
      const bMatch = POSITION_GROUP[b.position] === slot.group ? 1 : 0
      if (aMatch !== bMatch) return bMatch - aMatch
      return b.rating - a.rating
    })
  }, [slot, allPlayers])

  if (!slot) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="no-scrollbar safe-bottom relative max-h-[80%] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-border bg-night-2 px-4 pt-4 pb-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <h2 className="px-1 pb-3 font-display text-lg font-bold text-white">
          Выбор на позицию {slot.label}
        </h2>
        <div className="flex flex-col gap-2">
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              highlighted={player.id === currentPlayerId}
              onClick={() => onPick(player.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
