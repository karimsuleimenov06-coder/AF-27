import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlayerStats } from '../types/player'

export type StatBoosts = Partial<Record<keyof PlayerStats, number>>

interface UpgradesState {
  boosts: Record<string, StatBoosts>
  trainingPoints: Record<string, number>
  boostStat: (playerId: string, stat: keyof PlayerStats, amount: number) => void
  addTrainingPoints: (playerId: string, amount: number) => void
  spendTrainingPoint: (playerId: string) => boolean
}

export const UPGRADE_COST_COINS = 400
export const MAX_BOOST_PER_STAT = 15

export const useUpgradesStore = create<UpgradesState>()(
  persist(
    (set, get) => ({
      boosts: {},
      trainingPoints: {},
      boostStat: (playerId, stat, amount) =>
        set((s) => {
          const current = s.boosts[playerId] ?? {}
          const next = Math.min(MAX_BOOST_PER_STAT, (current[stat] ?? 0) + amount)
          return { boosts: { ...s.boosts, [playerId]: { ...current, [stat]: next } } }
        }),
      addTrainingPoints: (playerId, amount) =>
        set((s) => ({ trainingPoints: { ...s.trainingPoints, [playerId]: (s.trainingPoints[playerId] ?? 0) + amount } })),
      spendTrainingPoint: (playerId) => {
        const pts = get().trainingPoints[playerId] ?? 0
        if (pts <= 0) return false
        set((s) => ({ trainingPoints: { ...s.trainingPoints, [playerId]: pts - 1 } }))
        return true
      },
    }),
    { name: 'af27-upgrades-state' },
  ),
)
