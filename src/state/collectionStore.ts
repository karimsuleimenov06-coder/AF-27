import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player } from '../types/player'

interface CollectionState {
  extraPlayers: Player[]
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set) => ({
      extraPlayers: [],
      addPlayer: (player) => set((s) => ({ extraPlayers: [...s.extraPlayers, player] })),
      removePlayer: (playerId) => set((s) => ({ extraPlayers: s.extraPlayers.filter((p) => p.id !== playerId) })),
    }),
    { name: 'af27-collection-state' },
  ),
)
