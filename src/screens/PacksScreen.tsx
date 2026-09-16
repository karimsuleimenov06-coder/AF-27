import { useState } from 'react'
import { PACKS, type PackTier } from '../data/packs'
import { openPack } from '../lib/openPack'
import { sellValue } from '../lib/economy'
import { getAllBasePlayers } from '../data/playerRepo'
import { useAppStore } from '../state/appStore'
import { useCollectionStore } from '../state/collectionStore'
import { RARITY_STYLE } from '../lib/cardStyles'
import { RARITY_LABEL, type Player } from '../types/player'
import PlayerCard from '../components/PlayerCard'
import { CoinIcon, GemIcon, PackIcon } from '../components/Icons'

interface PulledCard {
  player: Player
  duplicate: boolean
  coinsAwarded: number
}

type Stage = 'browse' | 'opening' | 'reveal'

function PackTile({ pack, onOpen, disabled }: { pack: PackTier; onOpen: () => void; disabled: boolean }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className={`flex h-28 items-center justify-center bg-gradient-to-br ${pack.accent}`}>
        <PackIcon className="h-12 w-12 text-night/70" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <h3 className="font-display text-base font-bold text-white">{pack.name}</h3>
          <p className="mt-0.5 text-xs text-ink-2">{pack.description}</p>
        </div>
        <p className="text-xs text-ink">{pack.cardCount} карточки</p>
        <button
          onClick={onOpen}
          disabled={disabled}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan to-violet py-2.5 font-display text-sm font-bold text-night disabled:opacity-40"
        >
          {pack.cost.currency === 'coins' ? <CoinIcon className="h-4 w-4" /> : <GemIcon className="h-4 w-4" />}
          {pack.cost.amount.toLocaleString('ru-RU')}
        </button>
      </div>
    </div>
  )
}

export default function PacksScreen() {
  const profile = useAppStore((s) => s.profile)
  const spendCoins = useAppStore((s) => s.spendCoins)
  const spendGems = useAppStore((s) => s.spendGems)
  const addCoins = useAppStore((s) => s.addCoins)
  const addPlayer = useCollectionStore((s) => s.addPlayer)

  const [stage, setStage] = useState<Stage>('browse')
  const [activePack, setActivePack] = useState<PackTier | null>(null)
  const [cards, setCards] = useState<PulledCard[]>([])
  const [revealIndex, setRevealIndex] = useState(0)

  const canAfford = (pack: PackTier) =>
    pack.cost.currency === 'coins' ? profile.coins >= pack.cost.amount : profile.gems >= pack.cost.amount

  const handleOpen = (pack: PackTier) => {
    if (!canAfford(pack)) return
    const ok = pack.cost.currency === 'coins' ? spendCoins(pack.cost.amount) : spendGems(pack.cost.amount)
    if (!ok) return

    setActivePack(pack)
    setStage('opening')

    setTimeout(() => {
      const pulled = openPack(pack)
      const knownNames = new Set(getAllBasePlayers().map((p) => p.name))
      const result: PulledCard[] = pulled.map((player) => {
        const duplicate = knownNames.has(player.name)
        knownNames.add(player.name)
        return { player, duplicate, coinsAwarded: duplicate ? sellValue(player.value) : 0 }
      })
      setCards(result)
      setRevealIndex(0)
      setStage('reveal')
    }, 900)
  }

  const finishReveal = () => {
    for (const card of cards) {
      if (card.duplicate) addCoins(card.coinsAwarded)
      else addPlayer(card.player)
    }
    setStage('browse')
    setActivePack(null)
    setCards([])
  }

  if (stage === 'opening') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div
          className={`flex h-32 w-32 animate-pulse items-center justify-center rounded-3xl bg-gradient-to-br ${activePack?.accent} shadow-2xl`}
        >
          <PackIcon className="h-16 w-16 text-night/70" />
        </div>
        <p className="font-display text-sm font-semibold tracking-widest text-ink-2 uppercase">Открываем пак…</p>
      </div>
    )
  }

  if (stage === 'reveal') {
    const current = cards[revealIndex]
    const isLast = revealIndex === cards.length - 1
    const rarityStyle = RARITY_STYLE[current.player.rarity]

    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
        <p className="font-display text-xs font-semibold tracking-widest text-ink-2 uppercase">
          Карточка {revealIndex + 1} из {cards.length}
        </p>

        <div key={current.player.id} className="animate-[fadeIn_0.4s_ease-out]">
          <PlayerCard player={current.player} size="lg" />
        </div>

        {current.duplicate ? (
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 ${rarityStyle.chipBg}`}>
            <span className="font-display text-sm font-bold">Дубликат · +{current.coinsAwarded} монет</span>
          </div>
        ) : (
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 ${rarityStyle.chipBg}`}>
            <span className="font-display text-sm font-bold">Новый игрок · {RARITY_LABEL[current.player.rarity]}</span>
          </div>
        )}

        <button
          onClick={() => (isLast ? finishReveal() : setRevealIndex((i) => i + 1))}
          className="rounded-2xl bg-gradient-to-r from-cyan to-violet px-8 py-3 font-display text-base font-bold text-night active:scale-[0.97]"
        >
          {isLast ? 'Забрать всё' : 'Далее'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
      <h1 className="px-1 font-display text-xl font-bold text-white">Паки</h1>

      <div className="grid grid-cols-4 gap-3">
        {PACKS.map((pack) => (
          <PackTile key={pack.id} pack={pack} onOpen={() => handleOpen(pack)} disabled={!canAfford(pack)} />
        ))}
      </div>
    </div>
  )
}
