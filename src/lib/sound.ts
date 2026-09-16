import { useAppStore } from '../state/appStore'

let ctx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtor) return null
  if (!ctx) ctx = new AudioCtor()
  return ctx
}

export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

function enabled() {
  return useAppStore.getState().settings.soundEnabled
}

function getNoiseBuffer(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const buffer = c.createBuffer(1, c.sampleRate, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

function tone(c: AudioContext, freq: number, start: number, duration: number, type: OscillatorType, gain: number) {
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + start)
  amp.gain.setValueAtTime(0, c.currentTime + start)
  amp.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration)
  osc.connect(amp)
  amp.connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + duration + 0.02)
}

function noiseBurst(c: AudioContext, start: number, duration: number, filterFreq: number, gain: number) {
  const src = c.createBufferSource()
  src.buffer = getNoiseBuffer(c)
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  const amp = c.createGain()
  amp.gain.setValueAtTime(0, c.currentTime + start)
  amp.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.005)
  amp.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration)
  src.connect(filter)
  filter.connect(amp)
  amp.connect(c.destination)
  src.start(c.currentTime + start)
  src.stop(c.currentTime + start + duration + 0.02)
}

export function playWhistle() {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  tone(c, 2600, 0, 0.16, 'sine', 0.18)
  tone(c, 2600, 0.22, 0.16, 'sine', 0.18)
}

export function playKick() {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  noiseBurst(c, 0, 0.07, 1400, 0.22)
  tone(c, 180, 0, 0.05, 'triangle', 0.12)
}

export function playTackle() {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  noiseBurst(c, 0, 0.12, 500, 0.2)
}

export function playCard() {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  tone(c, 320, 0, 0.18, 'square', 0.08)
}

export function playGoal() {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  tone(c, 523, 0, 0.5, 'sine', 0.16)
  tone(c, 659, 0.12, 0.5, 'sine', 0.16)
  tone(c, 784, 0.24, 0.7, 'sine', 0.18)
  noiseBurst(c, 0, 1.4, 2200, 0.05)
}

export function playConcede() {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  tone(c, 300, 0, 0.3, 'sawtooth', 0.08)
  tone(c, 220, 0.15, 0.4, 'sawtooth', 0.07)
}

export function playUiTap() {
  if (!enabled()) return
  const c = getCtx()
  if (!c) return
  tone(c, 900, 0, 0.04, 'sine', 0.06)
}
