export interface Club {
  id: string
  name: string
  strength: number
  isUser: boolean
}

export const ASTRA_CUP_CLUBS: Club[] = [
  { id: 'astra', name: 'FC Astra', strength: 0, isUser: true },
  { id: 'northvale', name: 'Нортвейл', strength: 62, isUser: false },
  { id: 'castello', name: 'Кастелло Реал', strength: 70, isUser: false },
  { id: 'bright', name: 'Брайт Юнайтед', strength: 66, isUser: false },
  { id: 'selva', name: 'Сельва', strength: 74, isUser: false },
  { id: 'arcona', name: 'Аркона', strength: 78, isUser: false },
]

export interface Fixture {
  round: number
  home: string
  away: string
  homeGoals: number | null
  awayGoals: number | null
}

export function generateSchedule(clubs: Club[]): Fixture[] {
  const ids = clubs.map((c) => c.id)
  const n = ids.length
  const arr = ids.slice()
  const fixtures: Fixture[] = []

  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i]
      const away = arr[n - 1 - i]
      const [h, a] = r % 2 === 0 ? [home, away] : [away, home]
      fixtures.push({ round: r, home: h, away: a, homeGoals: null, awayGoals: null })
    }
    const last = arr.pop()!
    arr.splice(1, 0, last)
  }

  return fixtures
}

export interface TableRow {
  clubId: string
  played: number
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  points: number
}

export interface SeasonReward {
  coins: number
  gems: number
}

export function seasonRewardForPosition(position: number): SeasonReward {
  if (position === 1) return { coins: 2500, gems: 100 }
  if (position <= 3) return { coins: 1000, gems: 40 }
  return { coins: 400, gems: 15 }
}

export function computeTable(clubs: Club[], fixtures: Fixture[]): TableRow[] {
  const rows = new Map<string, TableRow>()
  for (const c of clubs) rows.set(c.id, { clubId: c.id, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, points: 0 })

  for (const f of fixtures) {
    if (f.homeGoals === null || f.awayGoals === null) continue
    const home = rows.get(f.home)!
    const away = rows.get(f.away)!
    home.played += 1
    away.played += 1
    home.gf += f.homeGoals
    home.ga += f.awayGoals
    away.gf += f.awayGoals
    away.ga += f.homeGoals
    if (f.homeGoals > f.awayGoals) {
      home.win += 1
      home.points += 3
      away.loss += 1
    } else if (f.homeGoals < f.awayGoals) {
      away.win += 1
      away.points += 3
      home.loss += 1
    } else {
      home.draw += 1
      away.draw += 1
      home.points += 1
      away.points += 1
    }
  }

  return [...rows.values()].sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf)
}

export function simulateScore(strengthA: number, strengthB: number): [number, number] {
  const diff = (strengthA - strengthB) / 12
  const lambdaA = Math.max(0.3, 1.35 + diff * 0.5)
  const lambdaB = Math.max(0.3, 1.35 - diff * 0.5)
  return [poissonGoals(lambdaA), poissonGoals(lambdaB)]
}

function poissonGoals(lambda: number): number {
  let l = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k += 1
    p *= Math.random()
  } while (p > l)
  return k - 1
}
