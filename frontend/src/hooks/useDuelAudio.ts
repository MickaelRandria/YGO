import { useCallback, useEffect, useRef } from 'react'
import type { PlayerId } from '../types'

type LpTier = 'light' | 'medium' | 'heavy'
type CardSound = 'verify' | 'place' | 'select'
type AudioBusName = 'ui' | 'lp' | 'cards' | 'transitions' | 'system'
type Envelope = 'impact' | 'reverse' | 'swell'

interface DuelAudioBuses {
  master: GainNode
  compressor: DynamicsCompressorNode
  ui: GainNode
  lp: GainNode
  cards: GainNode
  transitions: GainNode
  system: GainNode
  reverbInput: GainNode
  reverb: ConvolverNode
  reverbFilter: BiquadFilterNode
  reverbOutput: GainNode
}

interface DuelAudioEngine {
  context: AudioContext
  buses: DuelAudioBuses
  noiseBuffer: AudioBuffer
  saturationCurve: Float32Array<ArrayBuffer>
  sources: Set<AudioScheduledSourceNode>
}

interface VoiceOptions {
  bus: AudioBusName
  pan?: number
  filterType?: BiquadFilterType
  filterFrequency?: number
  filterQ?: number
  reverb?: number
}

interface ToneOptions extends VoiceOptions {
  from: number
  to: number
  duration: number
  volume: number
  type?: OscillatorType
  envelope?: Envelope
}

interface NoiseOptions extends VoiceOptions {
  from: number
  to: number
  duration: number
  volume: number
  envelope?: Envelope
}

const LP_TIERS = {
  light: { duration: .29, impact: .14, impactVolume: .31, textureVolume: .17, reverseVolume: .10, resonance: .06, reverb: .055 },
  medium: { duration: .47, impact: .19, impactVolume: .37, textureVolume: .22, reverseVolume: .12, resonance: .08, reverb: .085 },
  heavy: { duration: .68, impact: .25, impactVolume: .43, textureVolume: .27, reverseVolume: .14, resonance: .10, reverb: .12 },
} as const

const PLAYER_CHARACTER = {
  p1: { pan: -.1, impact: 106, resonance: 164, lossTexture: 1320, gainCeiling: 980, restoration: 122, seal: 520 },
  p2: { pan: .1, impact: 116, resonance: 174, lossTexture: 1580, gainCeiling: 1220, restoration: 136, seal: 660 },
} as const

const BUS_VOLUMES: Record<AudioBusName, number> = {
  ui: .12,
  lp: .4,
  cards: .3,
  transitions: .44,
  system: .48,
}

const tierFor = (amount: number): LpTier => Math.abs(amount) <= 500 ? 'light' : Math.abs(amount) <= 1500 ? 'medium' : 'heavy'
const boundedVariation = (spread = .015) => 1 + (Math.random() * 2 - 1) * spread
const safeFrequency = (value: number) => Math.max(35, value)

function makeSaturationCurve() {
  const curve = new Float32Array(512)
  const drive = 14
  for (let index = 0; index < curve.length; index += 1) {
    const input = index * 2 / (curve.length - 1) - 1
    curve[index] = (1 + drive) * input / (1 + drive * Math.abs(input))
  }
  return curve
}

function createNoiseBuffer(context: AudioContext) {
  const duration = 2.4
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    let lowMid = 0
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1
      lowMid = lowMid * .82 + white * .18
      data[index] = lowMid * .8 + white * .2
    }
  }
  return buffer
}

function createDarkImpulseResponse(context: AudioContext) {
  const duration = .82
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    let body = 0
    for (let index = 0; index < data.length; index += 1) {
      const progress = index / data.length
      const noise = Math.random() * 2 - 1
      body = body * .84 + noise * .16
      const decay = Math.pow(1 - progress, 3.2)
      data[index] = (body * .86 + noise * .14) * decay * (channel === 0 ? .94 : 1)
    }
  }
  return buffer
}

function createAudioEngine(context: AudioContext): DuelAudioEngine {
  const master = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const ui = context.createGain()
  const lp = context.createGain()
  const cards = context.createGain()
  const transitions = context.createGain()
  const system = context.createGain()
  const reverbInput = context.createGain()
  const reverb = context.createConvolver()
  const reverbFilter = context.createBiquadFilter()
  const reverbOutput = context.createGain()

  master.gain.value = .78
  compressor.threshold.value = -18
  compressor.knee.value = 12
  compressor.ratio.value = 4
  compressor.attack.value = .006
  compressor.release.value = .22
  ui.gain.value = BUS_VOLUMES.ui
  lp.gain.value = BUS_VOLUMES.lp
  cards.gain.value = BUS_VOLUMES.cards
  transitions.gain.value = BUS_VOLUMES.transitions
  system.gain.value = BUS_VOLUMES.system
  reverbInput.gain.value = .72
  reverb.buffer = createDarkImpulseResponse(context)
  reverbFilter.type = 'lowpass'
  reverbFilter.frequency.value = 2400
  reverbFilter.Q.value = .35
  reverbOutput.gain.value = .16

  ui.connect(master)
  lp.connect(master)
  cards.connect(master)
  transitions.connect(master)
  system.connect(master)
  master.connect(compressor).connect(context.destination)
  reverbInput.connect(reverb).connect(reverbFilter).connect(reverbOutput).connect(compressor)

  return {
    context,
    buses: { master, compressor, ui, lp, cards, transitions, system, reverbInput, reverb, reverbFilter, reverbOutput },
    noiseBuffer: createNoiseBuffer(context),
    saturationCurve: makeSaturationCurve(),
    sources: new Set(),
  }
}

function attachVoice(engine: DuelAudioEngine, source: AudioScheduledSourceNode, { bus, pan = 0, filterType = 'lowpass', filterFrequency = 1800, filterQ = .7, reverb = 0 }: VoiceOptions) {
  const { context, buses, saturationCurve } = engine
  const filter = context.createBiquadFilter()
  const saturation = context.createWaveShaper()
  const gain = context.createGain()
  const send = context.createGain()
  const panner = 'createStereoPanner' in context ? context.createStereoPanner() : null

  filter.type = filterType
  filter.frequency.value = filterFrequency
  filter.Q.value = filterQ
  saturation.curve = saturationCurve
  saturation.oversample = '2x'
  gain.gain.value = .0001
  send.gain.value = reverb

  source.connect(filter).connect(saturation).connect(gain)
  if (panner) {
    panner.pan.value = pan
    gain.connect(panner).connect(buses[bus])
  } else {
    gain.connect(buses[bus])
  }
  if (reverb > 0) gain.connect(send).connect(buses.reverbInput)

  engine.sources.add(source)
  source.onended = () => {
    engine.sources.delete(source)
    source.disconnect()
    filter.disconnect()
    saturation.disconnect()
    gain.disconnect()
    send.disconnect()
    panner?.disconnect()
  }

  return { filter, gain, panner }
}

function scheduleEnvelope(gain: GainNode, at: number, duration: number, volume: number, envelope: Envelope) {
  const quiet = .0001
  gain.gain.cancelScheduledValues(at)
  if (envelope === 'reverse') {
    gain.gain.setValueAtTime(quiet, at)
    gain.gain.exponentialRampToValueAtTime(volume, at + duration * .72)
    gain.gain.setValueAtTime(volume * .56, at + duration * .86)
    gain.gain.exponentialRampToValueAtTime(quiet, at + duration)
    return
  }
  if (envelope === 'swell') {
    gain.gain.setValueAtTime(quiet, at)
    gain.gain.exponentialRampToValueAtTime(volume * .82, at + duration * .32)
    gain.gain.setValueAtTime(volume, at + duration * .62)
    gain.gain.exponentialRampToValueAtTime(quiet, at + duration)
    return
  }
  const attack = Math.min(.016, duration * .16)
  gain.gain.setValueAtTime(quiet, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + attack)
  gain.gain.setValueAtTime(volume * .66, at + duration * .28)
  gain.gain.exponentialRampToValueAtTime(quiet, at + duration)
}

function tone(engine: DuelAudioEngine, at: number, { from, to, duration, volume, type = 'triangle', envelope = 'impact', ...voice }: ToneOptions) {
  const oscillator = engine.context.createOscillator()
  const nodes = attachVoice(engine, oscillator, voice)
  oscillator.type = type
  oscillator.frequency.setValueAtTime(safeFrequency(from), at)
  oscillator.frequency.exponentialRampToValueAtTime(safeFrequency(to), at + duration)
  scheduleEnvelope(nodes.gain, at, duration, volume, envelope)
  oscillator.start(at)
  oscillator.stop(at + duration + .04)
  return nodes
}

function noise(engine: DuelAudioEngine, at: number, { from, to, duration, volume, envelope = 'impact', ...voice }: NoiseOptions) {
  const source = engine.context.createBufferSource()
  source.buffer = engine.noiseBuffer
  source.playbackRate.value = boundedVariation()
  const nodes = attachVoice(engine, source, voice)
  nodes.filter.frequency.setValueAtTime(safeFrequency(from), at)
  nodes.filter.frequency.exponentialRampToValueAtTime(safeFrequency(to), at + duration)
  scheduleEnvelope(nodes.gain, at, duration, volume, envelope)
  const offset = Math.random() * Math.max(0, engine.noiseBuffer.duration - duration - .05)
  source.start(at, offset, duration + .03)
  source.stop(at + duration + .04)
  return nodes
}

function playLpLoss(engine: DuelAudioEngine, player: PlayerId, tier: LpTier, at: number) {
  const profile = LP_TIERS[tier]
  const character = PLAYER_CHARACTER[player]
  const variation = boundedVariation()

  noise(engine, at, {
    from: character.lossTexture * .72 * variation,
    to: 340,
    duration: profile.duration * .48,
    volume: profile.reverseVolume,
    envelope: 'reverse',
    bus: 'lp',
    pan: character.pan,
    filterType: 'bandpass',
    filterQ: .65,
    reverb: profile.reverb * .35,
  })
  const impactAt = at + profile.duration * .24
  tone(engine, impactAt, {
    from: character.impact * 1.15 * variation,
    to: character.impact * .58,
    duration: profile.impact,
    volume: profile.impactVolume,
    type: 'sine',
    bus: 'lp',
    pan: character.pan,
    filterFrequency: 620,
    reverb: profile.reverb,
  })
  noise(engine, impactAt, {
    from: character.lossTexture * variation,
    to: 260,
    duration: profile.duration,
    volume: profile.textureVolume,
    bus: 'lp',
    pan: character.pan,
    filterType: 'bandpass',
    filterQ: .8,
    reverb: profile.reverb,
  })
  tone(engine, at + profile.duration * .3, {
    from: character.resonance * 1.05,
    to: character.resonance * .88,
    duration: profile.duration * .72,
    volume: profile.resonance,
    type: 'triangle',
    bus: 'lp',
    pan: character.pan,
    filterFrequency: 920,
    reverb: profile.reverb,
  })
}

function playLpGain(engine: DuelAudioEngine, player: PlayerId, tier: LpTier, at: number) {
  const profile = LP_TIERS[tier]
  const character = PLAYER_CHARACTER[player]
  const variation = boundedVariation()
  const duration = profile.duration + .02

  noise(engine, at, {
    from: 240 * variation,
    to: character.gainCeiling,
    duration,
    volume: profile.textureVolume * .88,
    envelope: 'swell',
    bus: 'lp',
    pan: character.pan,
    filterType: 'bandpass',
    filterQ: .55,
    reverb: profile.reverb * .8,
  })
  tone(engine, at + .035, {
    from: character.restoration * .76,
    to: character.restoration,
    duration: duration * .78,
    volume: profile.impactVolume * .58,
    type: 'sine',
    envelope: 'swell',
    bus: 'lp',
    pan: character.pan,
    filterFrequency: 780,
    reverb: profile.reverb * .58,
  })
  tone(engine, at + .075, {
    from: character.restoration * 1.9,
    to: character.restoration * 2,
    duration: duration * .62,
    volume: profile.resonance * .68,
    type: 'triangle',
    envelope: 'swell',
    bus: 'lp',
    pan: character.pan,
    filterFrequency: 1080,
    reverb: profile.reverb * .42,
  })
  const sealAt = at + duration * .78
  noise(engine, sealAt, {
    from: character.seal,
    to: character.seal * .72,
    duration: .085,
    volume: profile.resonance * .82,
    bus: 'lp',
    pan: character.pan,
    filterType: 'bandpass',
    filterQ: 2.4,
    reverb: .015,
  })
  tone(engine, sealAt + .015, {
    from: character.resonance * .92,
    to: character.resonance,
    duration: .15,
    volume: profile.resonance * .58,
    type: 'triangle',
    bus: 'lp',
    pan: character.pan,
    filterFrequency: 860,
    reverb: profile.reverb * .4,
  })
}

function playPhase(engine: DuelAudioEngine, at: number) {
  noise(engine, at, {
    from: 1260,
    to: 610,
    duration: .18,
    volume: .12,
    bus: 'transitions',
    filterType: 'bandpass',
    filterQ: .8,
    reverb: .02,
  })
  noise(engine, at + .025, {
    from: 2600,
    to: 1450,
    duration: .07,
    volume: .024,
    bus: 'transitions',
    filterType: 'highpass',
    filterQ: .5,
  })
  tone(engine, at + .13, {
    from: 176,
    to: 118,
    duration: .095,
    volume: .1,
    type: 'triangle',
    bus: 'transitions',
    filterFrequency: 650,
    reverb: .035,
  })
  tone(engine, at + .155, {
    from: 235,
    to: 205,
    duration: .15,
    volume: .035,
    type: 'sine',
    bus: 'transitions',
    filterFrequency: 720,
    reverb: .045,
  })
}

function playTurn(engine: DuelAudioEngine, from: PlayerId, to: PlayerId, at: number) {
  const direction = from === 'p1' && to === 'p2' ? .22 : -.22
  const character = PLAYER_CHARACTER[to]
  const cardFlick = noise(engine, at, {
    from: 1380,
    to: 540,
    duration: .3,
    volume: .16,
    bus: 'transitions',
    pan: -direction,
    filterType: 'bandpass',
    filterQ: .72,
    reverb: .03,
  })
  if (cardFlick.panner) {
    cardFlick.panner.pan.setValueAtTime(-direction, at)
    cardFlick.panner.pan.linearRampToValueAtTime(direction, at + .3)
  }
  const air = noise(engine, at + .075, {
    from: 2400,
    to: 1200,
    duration: .22,
    volume: .026,
    bus: 'transitions',
    pan: -direction,
    filterType: 'highpass',
    filterQ: .45,
    reverb: .015,
  })
  if (air.panner) {
    air.panner.pan.setValueAtTime(-direction, at + .075)
    air.panner.pan.linearRampToValueAtTime(direction, at + .29)
  }
  tone(engine, at + .21, {
    from: 174,
    to: 104,
    duration: .34,
    volume: .17,
    type: 'triangle',
    bus: 'transitions',
    pan: direction,
    filterFrequency: 700,
    reverb: .08,
  })
  noise(engine, at + .23, {
    from: 620,
    to: 270,
    duration: .3,
    volume: .11,
    bus: 'transitions',
    pan: direction,
    filterType: 'bandpass',
    filterQ: 1.1,
    reverb: .07,
  })
  tone(engine, at + .5, {
    from: 112,
    to: 68,
    duration: .17,
    volume: .34,
    type: 'sine',
    bus: 'transitions',
    pan: direction,
    filterFrequency: 520,
    reverb: .11,
  })
  tone(engine, at + .59, {
    from: character.resonance * 1.04,
    to: character.resonance * .82,
    duration: .28,
    volume: .07,
    type: 'triangle',
    bus: 'transitions',
    pan: direction,
    filterFrequency: 820,
    reverb: .13,
  })
}

function playCard(engine: DuelAudioEngine, type: CardSound, at: number) {
  if (type === 'select') {
    tone(engine, at, {
      from: 158,
      to: 112,
      duration: .065,
      volume: .07,
      type: 'triangle',
      bus: 'ui',
      filterFrequency: 560,
    })
    return
  }
  if (type === 'place') {
    noise(engine, at, {
      from: 960,
      to: 460,
      duration: .13,
      volume: .11,
      bus: 'cards',
      filterType: 'bandpass',
      filterQ: .9,
      reverb: .015,
    })
    tone(engine, at + .08, {
      from: 162,
      to: 94,
      duration: .075,
      volume: .14,
      type: 'triangle',
      bus: 'cards',
      filterFrequency: 540,
      reverb: .025,
    })
    return
  }
  noise(engine, at, {
    from: 1260,
    to: 670,
    duration: .16,
    volume: .13,
    bus: 'cards',
    filterType: 'bandpass',
    filterQ: .76,
    reverb: .025,
  })
  tone(engine, at + .07, {
    from: 300,
    to: 176,
    duration: .12,
    volume: .13,
    type: 'triangle',
    bus: 'cards',
    filterFrequency: 820,
    reverb: .04,
  })
  tone(engine, at + .13, {
    from: 214,
    to: 242,
    duration: .26,
    volume: .06,
    type: 'sine',
    bus: 'cards',
    filterFrequency: 940,
    reverb: .09,
  })
}

function playDuelSeal(engine: DuelAudioEngine, at: number) {
  tone(engine, at + .08, {
    from: 116,
    to: 56,
    duration: .25,
    volume: .44,
    type: 'sine',
    bus: 'system',
    filterFrequency: 560,
    reverb: .12,
  })
  noise(engine, at, {
    from: 760,
    to: 250,
    duration: .64,
    volume: .19,
    envelope: 'reverse',
    bus: 'system',
    filterType: 'bandpass',
    filterQ: .7,
    reverb: .15,
  })
  tone(engine, at + .4, {
    from: 192,
    to: 114,
    duration: .66,
    volume: .13,
    type: 'triangle',
    bus: 'system',
    filterFrequency: 900,
    reverb: .18,
  })
  noise(engine, at + .58, {
    from: 430,
    to: 290,
    duration: .09,
    volume: .1,
    bus: 'system',
    filterType: 'bandpass',
    filterQ: 1.8,
    reverb: .06,
  })
}

export function useDuelAudio(enabled: boolean) {
  const engineRef = useRef<DuelAudioEngine | null>(null)

  const stopEngine = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    engineRef.current = null
    const now = engine.context.currentTime
    engine.buses.master.gain.cancelScheduledValues(now)
    engine.buses.master.gain.setValueAtTime(.0001, now)
    engine.sources.forEach(source => {
      try { source.stop(now) } catch { /* The source may already have ended. */ }
    })
    engine.sources.clear()
    if (engine.context.state !== 'closed') engine.context.close().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!enabled) stopEngine()
  }, [enabled, stopEngine])

  useEffect(() => () => stopEngine(), [stopEngine])

  useEffect(() => {
    const suspendWhenHidden = () => {
      const engine = engineRef.current
      if (document.hidden && engine?.context.state === 'running') engine.context.suspend().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', suspendWhenHidden)
    return () => document.removeEventListener('visibilitychange', suspendWhenHidden)
  }, [])

  const getEngine = useCallback(() => {
    if (!enabled || typeof window === 'undefined' || !window.AudioContext) return null
    let engine = engineRef.current
    if (!engine || engine.context.state === 'closed') {
      engine = createAudioEngine(new window.AudioContext())
      engineRef.current = engine
    }
    if (engine.context.state === 'suspended') engine.context.resume().catch(() => undefined)
    return engine
  }, [enabled])

  const playLpChange = useCallback((player: PlayerId, amount: number) => {
    if (!amount) return
    const engine = getEngine()
    if (!engine) return
    const at = engine.context.currentTime + .012
    const tier = tierFor(amount)
    if (amount < 0) playLpLoss(engine, player, tier, at)
    else playLpGain(engine, player, tier, at)
  }, [getEngine])

  const playPhaseChange = useCallback(() => {
    const engine = getEngine()
    if (engine) playPhase(engine, engine.context.currentTime + .012)
  }, [getEngine])

  const playTurnChange = useCallback((from: PlayerId, to: PlayerId) => {
    const engine = getEngine()
    if (engine) playTurn(engine, from, to, engine.context.currentTime + .012)
  }, [getEngine])

  const playCardInteraction = useCallback((type: CardSound) => {
    const engine = getEngine()
    if (engine) playCard(engine, type, engine.context.currentTime + .012)
  }, [getEngine])

  const playDuelEnd = useCallback(() => {
    const engine = getEngine()
    if (engine) playDuelSeal(engine, engine.context.currentTime + .012)
  }, [getEngine])

  return { playLpChange, playPhaseChange, playTurnChange, playCardInteraction, playDuelEnd }
}
