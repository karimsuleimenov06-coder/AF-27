import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PROMO_CODES } from '../data/promoCodes'
import { useAppStore } from './appStore'
import { useCollectionStore } from './collectionStore'

export interface RedeemResult {
  success: boolean
  message: string
}

interface PromoState {
  redeemed: Record<string, boolean>
  redeem: (rawCode: string) => RedeemResult
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set, get) => ({
      redeemed: {},
      redeem: (rawCode) => {
        const code = rawCode.trim().toUpperCase()
        if (!code) return { success: false, message: 'Введите промокод' }

        const effect = PROMO_CODES[code]
        if (!effect) return { success: false, message: 'Такого промокода не существует' }

        if (get().redeemed[code]) return { success: false, message: 'Этот промокод уже был активирован' }

        if (effect.type === 'gems') {
          useAppStore.getState().addGems(effect.amount)
        } else {
          // Collection membership itself is the one-per-account guard for the
          // card, but redeemed[code] is what actually stops a second
          // activation of the same code from ever reaching this branch.
          useCollectionStore.getState().addPlayer({ ...effect.player })
        }

        set((s) => ({ redeemed: { ...s.redeemed, [code]: true } }))

        return {
          success: true,
          message: effect.type === 'gems' ? `Начислено ${effect.amount} 💎 алмазов!` : `${effect.player.name} добавлен в коллекцию!`,
        }
      },
    }),
    { name: 'af27-promo-state' },
  ),
)
