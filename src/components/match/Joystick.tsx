import { useRef, useState } from 'react'

interface Props {
  onChange: (x: number, y: number) => void
}

const RADIUS = 44

export default function Joystick({ onChange }: Props) {
  const baseRef = useRef<HTMLDivElement>(null)
  const activePointer = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const updateFromEvent = (clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const d = Math.hypot(dx, dy)
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS
      dy = (dy / d) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    onChange(dx / RADIUS, -dy / RADIUS)
  }

  const reset = () => {
    activePointer.current = null
    setKnob({ x: 0, y: 0 })
    onChange(0, 0)
  }

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        activePointer.current = e.pointerId
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        updateFromEvent(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (activePointer.current !== e.pointerId) return
        updateFromEvent(e.clientX, e.clientY)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      className="relative flex h-28 w-28 shrink-0 touch-none items-center justify-center rounded-full border border-white/15 bg-black/25 backdrop-blur-sm"
    >
      <div
        className="h-12 w-12 rounded-full border border-white/40 bg-white/20 shadow-lg"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
