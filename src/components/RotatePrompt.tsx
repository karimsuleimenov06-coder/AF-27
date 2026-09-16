export default function RotatePrompt() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-night px-8 text-center">
      <svg
        viewBox="0 0 24 24"
        className="h-16 w-16 animate-[rotateHint_1.6s_ease-in-out_infinite] text-cyan"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M12 18h.01" />
      </svg>
      <div>
        <p className="font-display text-lg font-bold text-white">Поверните телефон</p>
        <p className="mt-1 text-sm text-ink">AF 27 работает в горизонтальной ориентации экрана</p>
      </div>
    </div>
  )
}
