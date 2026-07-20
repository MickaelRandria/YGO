import { useCallback, useEffect, useRef } from 'react'
import type { PlayerId } from '../types'

type LpTier = 'light' | 'medium' | 'heavy'
type CardSound = 'verify' | 'place'

const tierFor = (amount: number): LpTier => Math.abs(amount) <= 500 ? 'light' : Math.abs(amount) <= 1500 ? 'medium' : 'heavy'
const tokenCount = { light: 2, medium: 4, heavy: 6 } as const
const durationFor = { light: .2, medium: .36, heavy: .56 } as const

function connectPan(context: AudioContext, source: AudioNode, destination: AudioNode, pan: number) {
  if ('createStereoPanner' in context) {
    const panner = context.createStereoPanner()
    panner.pan.value = pan
    source.connect(panner).connect(destination)
    return
  }
  source.connect(destination)
}

function tone(context: AudioContext, at: number, { from, to, duration, volume, pan = 0, type = 'triangle' }: { from: number; to: number; duration: number; volume: number; pan?: number; type?: OscillatorType }) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(from, at)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + duration)
  gain.gain.setValueAtTime(.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + .012)
  gain.gain.exponentialRampToValueAtTime(.0001, at + duration)
  oscillator.connect(gain)
  connectPan(context, gain, context.destination, pan)
  oscillator.start(at)
  oscillator.stop(at + duration + .03)
}

function noise(context: AudioContext, at: number, { duration, volume, pan = 0 }: { duration: number; volume: number; pan?: number }) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length)
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  source.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.value = 1350
  filter.Q.value = .75
  gain.gain.setValueAtTime(volume, at)
  gain.gain.exponentialRampToValueAtTime(.0001, at + duration)
  source.connect(filter).connect(gain)
  connectPan(context, gain, context.destination, pan)
  source.start(at)
}

export function useDuelAudio(enabled: boolean) {
  const contextRef = useRef<AudioContext | null>(null)

  useEffect(() => () => {
    contextRef.current?.close().catch(() => undefined)
    contextRef.current = null
  }, [])

  const context = useCallback(() => {
    if (!enabled || typeof window === 'undefined' || !window.AudioContext) return null
    if (!contextRef.current) contextRef.current = new window.AudioContext()
    if (contextRef.current.state === 'suspended') contextRef.current.resume().catch(() => undefined)
    return contextRef.current
  }, [enabled])

  const playLpChange = useCallback((player: PlayerId, amount: number) => {
    if (!amount) return
    const audio = context()
    if (!audio) return
    const tier = tierFor(amount)
    const now = audio.currentTime + .01
    const loss = amount < 0
    const direction = player === 'p1' ? -.12 : .12
    const playerOffset = player === 'p1' ? -12 : 12
    const base = (loss ? 355 : 285) + playerOffset
    const count = tokenCount[tier]
    const duration = durationFor[tier]
    const variation = .97 + Math.random() * .06

    for (let index = 0; index < count; index += 1) {
      const progress = index / Math.max(1, count - 1)
      const frequency = loss ? base * (1 - progress * .32) : base * (1 + progress * .34)
      tone(audio, now + index * (duration / (count + 2)), { from: frequency * variation, to: frequency * (loss ? .87 : 1.12), duration: .055 + progress * .018, volume: .055 + (tier === 'heavy' ? .014 : 0), pan: direction })
    }
    tone(audio, now + duration * .46, { from: loss ? 112 : 156, to: loss ? 72 : 225, duration: duration * .56, volume: tier === 'heavy' ? .075 : .045, pan: direction, type: 'sine' })
    if (!loss) tone(audio, now + duration * .72, { from: 520 + playerOffset, to: 650 + playerOffset, duration: .12, volume: .045, pan: direction, type: 'sine' })
  }, [context])

  const playPhaseChange = useCallback(() => {
    const audio = context()
    if (!audio) return
    const now = audio.currentTime + .01
    noise(audio, now, { duration: .09, volume: .045 })
    tone(audio, now + .08, { from: 280, to: 340, duration: .13, volume: .055, type: 'triangle' })
  }, [context])

  const playTurnChange = useCallback((from: PlayerId, to: PlayerId) => {
    const audio = context()
    if (!audio) return
    const now = audio.currentTime + .01
    const direction = from === 'p1' && to === 'p2' ? .22 : -.22
    noise(audio, now, { duration: .13, volume: .06, pan: -direction })
    tone(audio, now + .08, { from: 220, to: 150, duration: .24, volume: .05, pan: direction, type: 'triangle' })
    tone(audio, now + .43, { from: 118, to: 88, duration: .18, volume: .09, pan: direction, type: 'sine' })
    tone(audio, now + .53, { from: 430, to: 350, duration: .1, volume: .04, pan: direction, type: 'square' })
  }, [context])

  const playCardInteraction = useCallback((type: CardSound) => {
    const audio = context()
    if (!audio) return
    const now = audio.currentTime + .01
    if (type === 'verify') {
      noise(audio, now, { duration: .08, volume: .04 })
      tone(audio, now + .07, { from: 340, to: 520, duration: .16, volume: .045, type: 'triangle' })
      tone(audio, now + .17, { from: 660, to: 780, duration: .12, volume: .03, type: 'sine' })
      return
    }
    noise(audio, now, { duration: .07, volume: .04 })
    tone(audio, now + .06, { from: 240, to: 190, duration: .09, volume: .04, type: 'triangle' })
  }, [context])

  return { playLpChange, playPhaseChange, playTurnChange, playCardInteraction }
}
