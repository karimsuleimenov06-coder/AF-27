import { useState, type ReactNode } from 'react'
import type { GraphicsQuality } from '../state/appStore'
import { useAppStore } from '../state/appStore'
import { usePromoStore, type RedeemResult } from '../state/promoStore'
import Toggle from '../components/Toggle'

const qualityOptions: { value: GraphicsQuality; label: string }[] = [
  { value: 'low', label: 'Низкое' },
  { value: 'medium', label: 'Среднее' },
  { value: 'high', label: 'Высокое' },
  { value: 'ultra', label: 'Ультра' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 font-display text-sm font-semibold tracking-wide text-ink-2 uppercase">{title}</h2>
      <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-surface">
        {children}
      </div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="font-display text-[15px] font-semibold text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-2">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function PromoSection() {
  const redeem = usePromoStore((s) => s.redeem)
  const [code, setCode] = useState('')
  const [feedback, setFeedback] = useState<RedeemResult | null>(null)

  const activate = () => {
    if (!code.trim()) return
    const result = redeem(code)
    setFeedback(result)
    if (result.success) setCode('')
  }

  return (
    <Section title="Промокод">
      <div className="flex flex-col gap-2.5 px-3.5 py-3.5">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setFeedback(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') activate()
            }}
            placeholder="Введите промокод"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3.5 py-3 font-display text-sm font-semibold tracking-wide text-white uppercase placeholder:text-ink-2 placeholder:normal-case focus:border-cyan focus:outline-none"
          />
          <button
            onClick={activate}
            disabled={!code.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-cyan to-violet px-5 py-3 font-display text-sm font-bold text-night active:scale-[0.97] disabled:opacity-40"
          >
            Активировать
          </button>
        </div>
        {feedback && (
          <p
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
              feedback.success ? 'bg-cyan/10 text-cyan' : 'bg-danger/10 text-danger'
            }`}
          >
            {feedback.success ? '✅ ' : '⚠️ '}
            {feedback.message}
          </p>
        )}
      </div>
    </Section>
  )
}

export default function SettingsScreen() {
  const settings = useAppStore((s) => s.settings)
  const profile = useAppStore((s) => s.profile)
  const setGraphicsQuality = useAppStore((s) => s.setGraphicsQuality)
  const setAutoQuality = useAppStore((s) => s.setAutoQuality)
  const toggleFpsCounter = useAppStore((s) => s.toggleFpsCounter)
  const toggleSound = useAppStore((s) => s.toggleSound)

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-6">
      <Section title="Профиль">
        <Row label={profile.clubName} hint={`Менеджер: ${profile.managerName} · Уровень ${profile.level}`}>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-display text-xs font-semibold text-ink">
            Ур. {profile.level}
          </span>
        </Row>
      </Section>

      <PromoSection />

      <Section title="Графика">
        <Row label="Авто-качество" hint="Игра сама подстраивает графику под ваше устройство">
          <Toggle checked={settings.autoQuality} onChange={setAutoQuality} label="Авто-качество" />
        </Row>
        <div className="px-3.5 py-3">
          <p className="font-display text-[15px] font-semibold text-white">Качество графики</p>
          <p className="mt-0.5 text-xs text-ink-2">
            {settings.autoQuality
              ? 'Отключите авто-режим, чтобы выбрать качество вручную.'
              : 'Влияет на детализацию травы, тени и разрешение поля во время матча.'}
          </p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {qualityOptions.map((opt) => {
              const active = settings.graphicsQuality === opt.value && !settings.autoQuality
              return (
                <button
                  key={opt.value}
                  disabled={settings.autoQuality}
                  onClick={() => setGraphicsQuality(opt.value)}
                  className={`rounded-xl border py-2 font-display text-xs font-semibold transition-colors ${
                    active
                      ? 'border-cyan bg-cyan/15 text-cyan'
                      : 'border-border bg-surface-2 text-ink disabled:opacity-40'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
        <Row label="Счётчик FPS" hint="Показывать текущий FPS в углу экрана">
          <Toggle checked={settings.showFpsCounter} onChange={toggleFpsCounter} label="Счётчик FPS" />
        </Row>
      </Section>

      <Section title="Звук">
        <Row label="Звук и музыка" hint="Свисток, удары по мячу, голы и карточки в матче">
          <Toggle checked={settings.soundEnabled} onChange={toggleSound} label="Звук" />
        </Row>
      </Section>

      <p className="px-1 text-center text-xs text-ink-2">AF 27 · Astra Football 27 · Бета v0.9.0</p>
    </div>
  )
}
