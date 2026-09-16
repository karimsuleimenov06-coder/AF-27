import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra'

interface Settings {
  graphicsQuality: GraphicsQuality
  autoQuality: boolean
  showFpsCounter: boolean
  soundEnabled: boolean
}

interface Profile {
  clubName: string
  managerName: string
  coins: number
  gems: number
  level: number
}

interface AppState {
  profile: Profile
  settings: Settings
  setGraphicsQuality: (quality: GraphicsQuality) => void
  setAutoQuality: (auto: boolean) => void
  toggleFpsCounter: () => void
  toggleSound: () => void
  addCoins: (amount: number) => void
  spendCoins: (amount: number) => boolean
  addGems: (amount: number) => void
  spendGems: (amount: number) => boolean
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: {
        clubName: 'FC Astra',
        managerName: 'Менеджер',
        coins: 5000,
        gems: 50,
        level: 1,
      },
      settings: {
        graphicsQuality: 'high',
        autoQuality: true,
        showFpsCounter: false,
        soundEnabled: true,
      },
      setGraphicsQuality: (quality) =>
        set((s) => ({ settings: { ...s.settings, graphicsQuality: quality, autoQuality: false } })),
      setAutoQuality: (auto) => set((s) => ({ settings: { ...s.settings, autoQuality: auto } })),
      toggleFpsCounter: () => set((s) => ({ settings: { ...s.settings, showFpsCounter: !s.settings.showFpsCounter } })),
      toggleSound: () => set((s) => ({ settings: { ...s.settings, soundEnabled: !s.settings.soundEnabled } })),
      addCoins: (amount) => set((s) => ({ profile: { ...s.profile, coins: Math.max(0, s.profile.coins + amount) } })),
      spendCoins: (amount) => {
        if (get().profile.coins < amount) return false
        set((s) => ({ profile: { ...s.profile, coins: s.profile.coins - amount } }))
        return true
      },
      addGems: (amount) => set((s) => ({ profile: { ...s.profile, gems: Math.max(0, s.profile.gems + amount) } })),
      spendGems: (amount) => {
        if (get().profile.gems < amount) return false
        set((s) => ({ profile: { ...s.profile, gems: s.profile.gems - amount } }))
        return true
      },
    }),
    { name: 'af27-app-state' },
  ),
)
