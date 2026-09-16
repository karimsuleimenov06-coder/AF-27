import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../state/appStore'

export default function FpsCounter() {
  const showFpsCounter = useAppStore((s) => s.settings.showFpsCounter)
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  const lastTime = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!showFpsCounter) return

    frames.current = 0
    lastTime.current = performance.now()

    const loop = () => {
      frames.current += 1
      const now = performance.now()
      const elapsed = now - lastTime.current
      if (elapsed >= 500) {
        setFps(Math.round((frames.current * 1000) / elapsed))
        frames.current = 0
        lastTime.current = now
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [showFpsCounter])

  if (!showFpsCounter) return null

  const color = fps >= 55 ? 'text-emerald' : fps >= 30 ? 'text-gold' : 'text-danger'

  return (
    <div className="pointer-events-none absolute top-14 right-2 z-[100]">
      <div className={`rounded-md border border-border bg-night/80 px-2 py-1 font-mono text-xs font-semibold backdrop-blur-sm ${color}`}>
        FPS: {fps}
      </div>
    </div>
  )
}
