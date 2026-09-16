import type { FormationSlot } from '../data/formations'
import type { Player } from '../types/player'
import { POSITION_GROUP_ACCENT } from '../lib/cardStyles'

interface Props {
  slots: FormationSlot[]
  lineup: Record<string, string | null>
  players: Player[]
  onSlotClick: (slotId: string) => void
}

export default function FormationPitch({ slots, lineup, players, onSlotClick }: Props) {
  const getPlayerById = (id: string) => players.find((p) => p.id === id)
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{
        aspectRatio: '0.68',
        backgroundImage:
          'repeating-linear-gradient(0deg, #0e3a20 0px, #0e3a20 40px, #114423 40px, #114423 80px)',
      }}
    >
      <div className="absolute inset-3 border border-white/25" />
      <div className="absolute top-1/2 right-3 left-3 h-px -translate-y-1/2 bg-white/25" />
      <div className="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />

      <div className="absolute top-3 right-1/2 left-1/2 h-[14%] w-[46%] -translate-x-1/2 border border-t-0 border-white/25" />
      <div className="absolute right-1/2 bottom-3 left-1/2 h-[14%] w-[46%] -translate-x-1/2 border border-b-0 border-white/25" />

      {slots.map((slot) => {
        const player = lineup[slot.id] ? getPlayerById(lineup[slot.id]!) : undefined
        const accent = POSITION_GROUP_ACCENT[slot.group]
        return (
          <button
            key={slot.id}
            onClick={() => onSlotClick(slot.id)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: `${slot.x * 100}%`, top: `${(1 - slot.y) * 100}%` }}
          >
            {player ? (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-br font-display text-[11px] font-bold text-night shadow-md ${accent}`}
              >
                {player.rating}
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-white/50 bg-black/30 text-white/70">
                +
              </span>
            )}
            <span className="rounded bg-black/55 px-1 font-display text-[9px] font-semibold text-white">
              {player ? player.name.split(' ').slice(-1)[0] : slot.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
