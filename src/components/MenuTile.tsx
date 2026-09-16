import type { ComponentType, SVGProps } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from './Icons'

interface Props {
  to: string
  title: string
  subtitle: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  accent?: string
}

export default function MenuTile({ to, title, subtitle, Icon, accent = 'from-violet to-cyan' }: Props) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left active:scale-[0.98] transition-transform"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-night`}>
        <Icon className="h-5.5 w-5.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-semibold text-white">{title}</span>
        <span className="block truncate text-xs text-ink-2">{subtitle}</span>
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-2" />
    </button>
  )
}
