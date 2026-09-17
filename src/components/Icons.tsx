import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function SquadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 3 4 6v3l3-1v13h10V8l3 1V6l-4-3-3 3h-2z" />
    </svg>
  )
}

export function PackIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
      <path d="M12 13v7.5" />
    </svg>
  )
}

export function TransferIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m7 7 10 0" />
      <path d="m14 4 3 3-3 3" />
      <path d="m17 17-10 0" />
      <path d="m10 20-3-3 3-3" />
    </svg>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a3 3 0 0 0 3 5" />
      <path d="M16 5h3a3 3 0 0 1-3 5" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 16h4l1 4H9l1-4Z" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.13.31.35.58.63.76.28.19.61.29.95.28H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export function CoinIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#00000022" strokeWidth={1.5} />
      <text x="12" y="16.5" fontSize="11" fontWeight="700" textAnchor="middle" fill="#5a3d00" fontFamily="Rajdhani, sans-serif">
        A
      </text>
    </svg>
  )
}

export function GemIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 3 12 0 4 6-10 12L2 9Z" />
      <path d="M2 9h20" />
      <path d="m9 3-3 6 6 12 6-12-3-6" />
    </svg>
  )
}

export function BallIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 4 3-1.5 4.5h-5L8 10z" />
      <path d="M12 3v4M4.5 8l3.5 2M4.5 16l3.5-2M19.5 8l-3.5 2M19.5 16l-3.5-2M12 21v-4" />
    </svg>
  )
}

export function UpgradeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20V6" />
      <path d="m6 11 6-6 6 6" />
      <path d="M6 20h12" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}
