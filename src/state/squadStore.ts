import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FORMATIONS, type FormationId } from '../data/formations'
import { getAllEffectivePlayers } from '../data/playerRepo'
import { POSITION_GROUP } from '../types/player'

export type Lineup = Record<string, string | null>

function autoFillLineup(formationId: FormationId): Lineup {
  const slots = FORMATIONS[formationId]
  const used = new Set<string>()
  const lineup: Lineup = {}
  const byRating = [...getAllEffectivePlayers()].sort((a, b) => b.rating - a.rating)

  for (const slot of slots) {
    const candidate = byRating.find((p) => !used.has(p.id) && POSITION_GROUP[p.position] === slot.group)
    if (candidate) {
      used.add(candidate.id)
      lineup[slot.id] = candidate.id
    } else {
      lineup[slot.id] = null
    }
  }

  for (const slot of slots) {
    if (lineup[slot.id] === null) {
      const fallback = byRating.find((p) => !used.has(p.id))
      if (fallback) {
        used.add(fallback.id)
        lineup[slot.id] = fallback.id
      }
    }
  }

  return lineup
}

interface SquadState {
  formationId: FormationId
  lineup: Lineup
  setFormation: (id: FormationId) => void
  assignPlayer: (slotId: string, playerId: string) => void
  clearSlot: (slotId: string) => void
}

const initialFormation: FormationId = '4-3-3'

export const useSquadStore = create<SquadState>()(
  persist(
    (set) => ({
      formationId: initialFormation,
      lineup: autoFillLineup(initialFormation),
      setFormation: (id) => set({ formationId: id, lineup: autoFillLineup(id) }),
      assignPlayer: (slotId, playerId) =>
        set((s) => {
          const lineup = { ...s.lineup }
          const prevSlotOfPlayer = Object.keys(lineup).find((key) => lineup[key] === playerId)
          const displaced = lineup[slotId] ?? null
          if (prevSlotOfPlayer) lineup[prevSlotOfPlayer] = displaced
          lineup[slotId] = playerId
          return { lineup }
        }),
      clearSlot: (slotId) => set((s) => ({ lineup: { ...s.lineup, [slotId]: null } })),
    }),
    { name: 'af27-squad-state' },
  ),
)

export function getBenchPlayerIds(lineup: Lineup): string[] {
  const used = new Set(Object.values(lineup).filter(Boolean))
  return getAllEffectivePlayers()
    .filter((p) => !used.has(p.id))
    .map((p) => p.id)
}
