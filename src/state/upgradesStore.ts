import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player, PlayerStats } from '../types/player'
import { applyXpGain } from '../lib/xp'
import { useCollectionStore } from './collectionStore'

export type StatBoosts = Partial<Record<keyof PlayerStats, number>>

interface UpgradesState {
  boosts: Record<string, StatBoosts>
  xp: Record<string, number>
  protectedIds: Record<string, boolean>
  /** Feeds `donorId` (removed from the collection permanently) into
   * `targetBasePlayer`'s XP progress. `xpGain` is precomputed by the caller
   * via lib/xp's xpFromDonor so the confirmation UI and the actual effect
   * always agree on the same number. */
  sacrifice: (donorId: string, targetBasePlayer: Player, xpGain: number) => void
  toggleProtected: (playerId: string) => void
}

export const useUpgradesStore = create<UpgradesState>()(
  persist(
    (set) => ({
      boosts: {},
      xp: {},
      protectedIds: {},
      sacrifice: (donorId, targetBasePlayer, xpGain) => {
        set((s) => {
          const currentBoosts = s.boosts[targetBasePlayer.id] ?? {}
          const currentXp = s.xp[targetBasePlayer.id] ?? 0
          const result = applyXpGain(targetBasePlayer, currentBoosts, currentXp, xpGain)
          return {
            boosts: { ...s.boosts, [targetBasePlayer.id]: result.boosts },
            xp: { ...s.xp, [targetBasePlayer.id]: result.xp },
          }
        })
        useCollectionStore.getState().removePlayer(donorId)
      },
      toggleProtected: (playerId) =>
        set((s) => ({ protectedIds: { ...s.protectedIds, [playerId]: !s.protectedIds[playerId] } })),
    }),
    { name: 'af27-upgrades-state', version: 2 },
  ),
)
