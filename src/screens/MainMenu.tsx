import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../state/appStore'
import MenuTile from '../components/MenuTile'
import { BallIcon, PackIcon, SettingsIcon, SquadIcon, TransferIcon, TrophyIcon } from '../components/Icons'

export default function MainMenu() {
  const navigate = useNavigate()
  const profile = useAppStore((s) => s.profile)

  return (
    <div className="grid h-full grid-cols-2 gap-4 px-4 py-4">
      <section className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-night-2 via-surface to-night-2 p-5">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-violet/20 blur-3xl" />

        <div className="relative flex items-center gap-2">
          <span className="font-display text-2xl font-bold tracking-wide text-white">AF</span>
          <span className="font-display text-2xl font-bold tracking-wide text-gold">27</span>
          <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-cyan uppercase">
            Бета
          </span>
        </div>
        <p className="relative mt-0.5 font-display text-xs font-semibold tracking-[0.2em] text-ink-2 uppercase">
          Astra Football 27
        </p>

        <p className="relative mt-3 text-sm text-ink">
          Добро пожаловать, <span className="font-semibold text-white">{profile.managerName}</span>. Ваш клуб —{' '}
          <span className="font-semibold text-white">{profile.clubName}</span>.
        </p>

        <button
          onClick={() => navigate('/match')}
          className="relative mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan to-violet py-3 font-display text-base font-bold text-night active:scale-[0.98] transition-transform"
        >
          <BallIcon className="h-5 w-5" />
          Быстрый матч
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 font-display text-sm font-semibold tracking-wide text-ink-2 uppercase">Меню клуба</h2>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <MenuTile to="/squad" title="Состав" subtitle="Игроки, позиции, схема" Icon={SquadIcon} accent="from-cyan to-emerald" />
          <MenuTile to="/packs" title="Паки" subtitle="Откройте новых игроков" Icon={PackIcon} accent="from-gold to-gold-2" />
          <MenuTile to="/transfers" title="Трансферы" subtitle="Рынок и сделки" Icon={TransferIcon} accent="from-violet to-cyan" />
          <MenuTile to="/tournaments" title="Турниры" subtitle="Соревнования и лиги" Icon={TrophyIcon} accent="from-emerald to-cyan" />
          <MenuTile to="/settings" title="Настройки" subtitle="Графика, звук, FPS" Icon={SettingsIcon} accent="from-ink-2 to-surface-2" />
        </div>
      </section>
    </div>
  )
}
