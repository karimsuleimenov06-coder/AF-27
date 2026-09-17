import { useMemo, useState } from 'react'
import { generatePlayer } from '../lib/playerGenerator'
import { marketPrice, sellValue } from '../lib/economy'
import { useAppStore } from '../state/appStore'
import { useCollectionStore } from '../state/collectionStore'
import { useSquadStore } from '../state/squadStore'
import { useAllPlayers } from '../data/playerRepo'
import type { Player, Rarity } from '../types/player'
import PlayerRow from '../components/PlayerRow'
import { CoinIcon } from '../components/Icons'

const MARKET_SIZE = 8
// Icons and promo cards never roll or list on the transfer market.
const MARKET_ODDS: Record<Rarity, number> = { bronze: 0.22, silver: 0.4, gold: 0.3, special: 0.08, icon: 0, promo: 0 }

function rollMarketRarity(): Rarity {
  const roll = Math.random()
  let acc = 0
  for (const r of ['bronze', 'silver', 'gold', 'special'] as Rarity[]) {
    acc += MARKET_ODDS[r]
    if (roll <= acc) return r
  }
  return 'bronze'
}

function generateMarket(size: number): Player[] {
  return Array.from({ length: size }, () => generatePlayer(rollMarketRarity()))
}

export default function TransfersScreen() {
  const [tab, setTab] = useState<'market' | 'sell'>('market')
  const [market, setMarket] = useState<Player[]>(() => generateMarket(MARKET_SIZE))
  const profile = useAppStore((s) => s.profile)
  const spendCoins = useAppStore((s) => s.spendCoins)
  const addCoins = useAppStore((s) => s.addCoins)
  const addPlayer = useCollectionStore((s) => s.addPlayer)
  const extraPlayers = useCollectionStore((s) => s.extraPlayers)
  const removePlayer = useCollectionStore((s) => s.removePlayer)
  const lineup = useSquadStore((s) => s.lineup)
  const allPlayers = useAllPlayers()

  const lineupIds = useMemo(() => new Set(Object.values(lineup).filter(Boolean)), [lineup])
  const effectiveById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers])

  const sellable = extraPlayers
    .filter((p) => !lineupIds.has(p.id))
    .map((p) => effectiveById.get(p.id) ?? p)
    .sort((a, b) => b.rating - a.rating)

  const buyPlayer = (player: Player) => {
    if (!spendCoins(marketPrice(player.value))) return
    addPlayer(player)
    setMarket((m) => m.map((p) => (p.id === player.id ? generatePlayer(rollMarketRarity()) : p)))
  }

  const sellPlayer = (player: Player) => {
    removePlayer(player.id)
    addCoins(sellValue(player.value))
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
      <div className="flex items-center justify-between px-1">
        <h1 className="font-display text-xl font-bold text-white">Трансферы</h1>
        <span className="flex items-center gap-1 font-display text-sm font-semibold text-gold">
          <CoinIcon className="h-4 w-4" /> {profile.coins.toLocaleString('ru-RU')}
        </span>
      </div>

      <div className="flex rounded-xl border border-border bg-surface p-1">
        <button
          onClick={() => setTab('market')}
          className={`flex-1 rounded-lg py-2 font-display text-sm font-semibold transition-colors ${
            tab === 'market' ? 'bg-cyan/15 text-cyan' : 'text-ink'
          }`}
        >
          Рынок
        </button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 rounded-lg py-2 font-display text-sm font-semibold transition-colors ${
            tab === 'sell' ? 'bg-cyan/15 text-cyan' : 'text-ink'
          }`}
        >
          Продать ({sellable.length})
        </button>
      </div>

      {tab === 'market' ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setMarket(generateMarket(MARKET_SIZE))}
            className="self-end rounded-full border border-border bg-surface px-3 py-1.5 font-display text-xs font-semibold text-ink"
          >
            Обновить рынок
          </button>
          {market.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              onClick={() => buyPlayer(player)}
              right={
                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-gold/15 px-2.5 py-1.5 font-display text-xs font-bold text-gold">
                  <CoinIcon className="h-3.5 w-3.5" /> {marketPrice(player.value).toLocaleString('ru-RU')}
                </span>
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sellable.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-ink-2">
              Нет свободных игроков на продажу. Купите игроков на рынке или откройте паки.
            </p>
          )}
          {sellable.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              onClick={() => sellPlayer(player)}
              right={
                <span className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 font-display text-xs font-bold text-ink">
                  <CoinIcon className="h-3.5 w-3.5 text-gold" /> +{sellValue(player.value).toLocaleString('ru-RU')}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
