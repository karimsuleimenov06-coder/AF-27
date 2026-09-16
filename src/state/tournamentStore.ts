import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ASTRA_CUP_CLUBS, computeTable, generateSchedule, seasonRewardForPosition, simulateScore, type Fixture } from '../data/tournament'
import { useAppStore } from './appStore'

interface TournamentState {
  fixtures: Fixture[]
  currentRound: number
  activeFixtureIndex: number | null
  startUserFixture: () => void
  clearActiveFixture: () => void
  recordActiveFixtureResult: (homeGoals: number, awayGoals: number) => void
  autoSimUserFixture: (userStrength: number) => void
  advanceRound: (userStrength: number) => void
  resetSeason: () => void
}

const TOTAL_ROUNDS = ASTRA_CUP_CLUBS.length - 1

function findAstraFixtureIndex(fixtures: Fixture[], round: number): number {
  return fixtures.findIndex((f) => f.round === round && (f.home === 'astra' || f.away === 'astra'))
}

function grantSeasonReward(fixtures: Fixture[]) {
  const table = computeTable(ASTRA_CUP_CLUBS, fixtures)
  const position = table.findIndex((row) => row.clubId === 'astra') + 1
  const rewards = seasonRewardForPosition(position)
  useAppStore.getState().addCoins(rewards.coins)
  useAppStore.getState().addGems(rewards.gems)
}

function simulateFixture(fixtures: Fixture[], index: number, userStrength: number): Fixture[] {
  const f = fixtures[index]
  if (f.homeGoals !== null) return fixtures
  const homeClub = ASTRA_CUP_CLUBS.find((c) => c.id === f.home)!
  const awayClub = ASTRA_CUP_CLUBS.find((c) => c.id === f.away)!
  const homeStrength = homeClub.isUser ? userStrength : homeClub.strength
  const awayStrength = awayClub.isUser ? userStrength : awayClub.strength
  const [hg, ag] = simulateScore(homeStrength, awayStrength)
  const next = [...fixtures]
  next[index] = { ...f, homeGoals: hg, awayGoals: ag }
  return next
}

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      fixtures: generateSchedule(ASTRA_CUP_CLUBS),
      currentRound: 0,
      activeFixtureIndex: null,
      startUserFixture: () => {
        const idx = findAstraFixtureIndex(get().fixtures, get().currentRound)
        if (idx >= 0) set({ activeFixtureIndex: idx })
      },
      clearActiveFixture: () => set({ activeFixtureIndex: null }),
      recordActiveFixtureResult: (homeGoals, awayGoals) =>
        set((s) => {
          if (s.activeFixtureIndex === null) return s
          const next = [...s.fixtures]
          const f = next[s.activeFixtureIndex]
          next[s.activeFixtureIndex] = { ...f, homeGoals, awayGoals }
          return { fixtures: next, activeFixtureIndex: null }
        }),
      autoSimUserFixture: (userStrength) =>
        set((s) => {
          const idx = findAstraFixtureIndex(s.fixtures, s.currentRound)
          if (idx < 0) return s
          return { fixtures: simulateFixture(s.fixtures, idx, userStrength) }
        }),
      advanceRound: (userStrength) =>
        set((s) => {
          let fixtures = s.fixtures
          for (let i = 0; i < fixtures.length; i++) {
            if (fixtures[i].round === s.currentRound && fixtures[i].homeGoals === null) {
              fixtures = simulateFixture(fixtures, i, userStrength)
            }
          }
          const wasIncomplete = s.currentRound < TOTAL_ROUNDS
          const nextRound = Math.min(TOTAL_ROUNDS, s.currentRound + 1)
          if (wasIncomplete && nextRound >= TOTAL_ROUNDS) grantSeasonReward(fixtures)
          return { fixtures, currentRound: nextRound }
        }),
      resetSeason: () => set({ fixtures: generateSchedule(ASTRA_CUP_CLUBS), currentRound: 0, activeFixtureIndex: null }),
    }),
    { name: 'af27-tournament-state' },
  ),
)

export { TOTAL_ROUNDS }
