import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../state/appStore'
import { CoinIcon, GemIcon, SettingsIcon } from './Icons'

export default function TopBar() {
  const navigate = useNavigate()
  const profile = useAppStore((s) => s.profile)

  return (
    <header className="safe-top flex items-center justify-between gap-2 border-b border-border/60 bg-night-2/80 px-3 pt-2 pb-2 backdrop-blur-sm">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1 active:scale-95 transition-transform"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan text-xs font-bold font-display">
          {profile.clubName.slice(0, 2).toUpperCase()}
        </span>
        <span className="max-w-[92px] truncate font-display text-sm font-semibold text-white">{profile.clubName}</span>
      </button>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <CoinIcon className="h-4 w-4 text-gold" />
          <span className="font-display text-sm font-semibold tabular-nums">{profile.coins.toLocaleString('ru-RU')}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
          <GemIcon className="h-4 w-4 text-cyan" />
          <span className="font-display text-sm font-semibold tabular-nums">{profile.gems}</span>
        </div>
        <button
          onClick={() => navigate('/settings')}
          aria-label="Настройки"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink active:scale-95 transition-transform"
        >
          <SettingsIcon className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  )
}
