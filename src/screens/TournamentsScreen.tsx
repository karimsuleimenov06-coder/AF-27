import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTournamentStore, TOTAL_ROUNDS } from '../state/tournamentStore'
import { useSquadStore } from '../state/squadStore'
import { useAllPlayers } from '../data/playerRepo'
import { ASTRA_CUP_CLUBS, computeTable, seasonRewardForPosition, type Fixture } from '../data/tournament'
import { TrophyIcon } from '../components/Icons'

function clubName(id: string) {
  return ASTRA_CUP_CLUBS.find((c) => c.id === id)?.name ?? id
}

function FixtureRow({ fixture, onPlay, canPlay }: { fixture: Fixture; onPlay?: () => void; canPlay?: boolean }) {
  const played = fixture.homeGoals !== null
  const involvesAstra = fixture.home === 'astra' || fixture.away === 'astra'
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="flex-1 text-right text-sm font-medium text-white">{clubName(fixture.home)}</div>
      <div className="shrink-0 px-2 font-display text-sm font-bold text-ink tabular-nums">
        {played ? `${fixture.homeGoals} : ${fixture.awayGoals}` : 'vs'}
      </div>
      <div className="flex-1 text-sm font-medium text-white">{clubName(fixture.away)}</div>
      {involvesAstra && !played && canPlay && (
        <button
          onClick={onPlay}
          className="shrink-0 rounded-lg bg-gradient-to-r from-cyan to-violet px-3 py-1.5 font-display text-xs font-bold text-night"
        >
          Играть
        </button>
      )}
    </div>
  )
}

export default function TournamentsScreen() {
  const navigate = useNavigate()
  const { fixtures, currentRound, startUserFixture, autoSimUserFixture, advanceRound, resetSeason } = useTournamentStore()
  const { lineup } = useSquadStore()
  const players = useAllPlayers()

  const userStrength = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p]))
    const ids = Object.values(lineup).filter(Boolean) as string[]
    if (ids.length === 0) return 68
    const sum = ids.reduce((acc, id) => acc + (byId.get(id)?.rating ?? 65), 0)
    return Math.round(sum / ids.length)
  }, [lineup, players])

  const table = useMemo(() => computeTable(ASTRA_CUP_CLUBS, fixtures), [fixtures])
  const seasonComplete = currentRound >= TOTAL_ROUNDS
  const astraPosition = table.findIndex((r) => r.clubId === 'astra') + 1
  const seasonReward = seasonRewardForPosition(astraPosition)
  const roundFixtures = fixtures.filter((f) => f.round === currentRound)
  const astraFixture = roundFixtures.find((f) => f.home === 'astra' || f.away === 'astra')
  const astraResolved = !astraFixture || astraFixture.homeGoals !== null

  const handlePlay = () => {
    startUserFixture()
    navigate('/match')
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
      <div className="flex items-center justify-between px-1">
        <h1 className="font-display text-xl font-bold text-white">Кубок Astra</h1>
        <span className="font-display text-sm font-semibold text-ink-2">
          {seasonComplete ? 'Сезон завершён' : `Тур ${currentRound + 1} / ${TOTAL_ROUNDS}`}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border text-ink-2">
              <th className="px-2.5 py-2 text-left font-display font-semibold">Клуб</th>
              <th className="px-1.5 py-2 font-display font-semibold">И</th>
              <th className="px-1.5 py-2 font-display font-semibold">В</th>
              <th className="px-1.5 py-2 font-display font-semibold">Н</th>
              <th className="px-1.5 py-2 font-display font-semibold">П</th>
              <th className="px-1.5 py-2 font-display font-semibold">М</th>
              <th className="px-2.5 py-2 font-display font-semibold">О</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const club = ASTRA_CUP_CLUBS.find((c) => c.id === row.clubId)!
              return (
                <tr key={row.clubId} className={`border-b border-border/50 last:border-0 ${club.isUser ? 'bg-cyan/10' : ''}`}>
                  <td className="px-2.5 py-2 font-medium text-white">
                    {i + 1}. {club.name}
                  </td>
                  <td className="px-1.5 py-2 text-center tabular-nums text-ink">{row.played}</td>
                  <td className="px-1.5 py-2 text-center tabular-nums text-ink">{row.win}</td>
                  <td className="px-1.5 py-2 text-center tabular-nums text-ink">{row.draw}</td>
                  <td className="px-1.5 py-2 text-center tabular-nums text-ink">{row.loss}</td>
                  <td className="px-1.5 py-2 text-center tabular-nums text-ink">
                    {row.gf}-{row.ga}
                  </td>
                  <td className="px-2.5 py-2 text-center font-display font-bold text-white tabular-nums">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {seasonComplete ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-5 text-center">
          <TrophyIcon className="h-10 w-10 text-gold" />
          <p className="font-display text-lg font-bold text-white">
            {table[0]?.clubId === 'astra' ? 'FC Astra — чемпион Кубка Astra!' : `Победитель: ${clubName(table[0]?.clubId ?? '')}`}
          </p>
          <p className="text-sm text-ink">
            FC Astra — {astraPosition} место · +{seasonReward.coins} монет, +{seasonReward.gems} кристаллов
          </p>
          <button
            onClick={resetSeason}
            className="rounded-xl bg-gradient-to-r from-cyan to-violet px-5 py-2.5 font-display text-sm font-bold text-night"
          >
            Начать новый сезон
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="px-1 font-display text-sm font-semibold tracking-wide text-ink-2 uppercase">
            Тур {currentRound + 1}
          </h2>
          {roundFixtures.map((f, i) => (
            <FixtureRow key={i} fixture={f} onPlay={handlePlay} canPlay />
          ))}

          {astraFixture && !astraResolved && (
            <button
              onClick={() => autoSimUserFixture(userStrength)}
              className="self-center rounded-full border border-border bg-surface px-4 py-1.5 font-display text-xs font-semibold text-ink"
            >
              Симулировать мой матч
            </button>
          )}

          {astraResolved && (
            <button
              onClick={() => advanceRound(userStrength)}
              className="mt-1 rounded-xl bg-gradient-to-r from-cyan to-violet py-2.5 font-display text-sm font-bold text-night"
            >
              Продолжить турнир
            </button>
          )}
        </div>
      )}
    </div>
  )
}
