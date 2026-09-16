import { NavLink } from 'react-router-dom'
import { HomeIcon, PackIcon, SettingsIcon, SquadIcon, TransferIcon, TrophyIcon } from './Icons'

const items = [
  { to: '/', label: 'Главная', Icon: HomeIcon, end: true },
  { to: '/squad', label: 'Состав', Icon: SquadIcon },
  { to: '/packs', label: 'Паки', Icon: PackIcon },
  { to: '/transfers', label: 'Трансферы', Icon: TransferIcon },
  { to: '/tournaments', label: 'Турниры', Icon: TrophyIcon },
  { to: '/settings', label: 'Настройки', Icon: SettingsIcon },
]

export default function SideNav() {
  return (
    <nav className="safe-left flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-night-2/95 py-3 backdrop-blur-sm">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex w-16 flex-col items-center gap-0.5 rounded-xl py-2 transition-colors ${
              isActive ? 'text-cyan' : 'text-ink-2'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-cyan/15' : ''}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-display text-[10px] font-semibold leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
