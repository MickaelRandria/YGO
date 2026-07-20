import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { PlayerId } from '../types'
import { LpActionButton } from './LpActionButton'

const lossAdjustments = [-100, -500, -1000, -2000] as const
const gainAdjustments = [100, 500, 1000, 2000] as const
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const formatDelta = (value: number) => `${value > 0 ? '+' : ''}${value}`

export function ScoreDuelistPanel({ player, lp, last, activePlayer, hapticsEnabled, onAdjust, onCustom, onSoundLp }: { player: PlayerId; lp: number; last?: number; activePlayer: PlayerId; hapticsEnabled: boolean; onAdjust: (amount: number) => void; onCustom: () => void; onSoundLp: (player: PlayerId, amount: number) => void }) {
  const previousLp = useRef(lp)
  const displayedLp = useRef(lp)
  const [displayLp, setDisplayLp] = useState(lp)
  const [feedback, setFeedback] = useState<number | null>(null)
  const [impact, setImpact] = useState(false)
  const isActive = activePlayer === player
  const visualFeedback = feedback !== null && !reducedMotion()
  const playerNumber = player === 'p1' ? '1' : '2'

  useEffect(() => {
    const previous = previousLp.current
    if (previous === lp) {
      displayedLp.current = lp
      setDisplayLp(lp)
      return
    }

    previousLp.current = lp
    const from = displayedLp.current
    const difference = lp - previous
    setFeedback(difference)
    setImpact(!reducedMotion())
    if (difference < 0 && hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(Math.abs(difference) >= 2000 ? [30, 40, 30] : Math.abs(difference) >= 1000 ? 30 : 15)
    }

    const impactTimer = window.setTimeout(() => setImpact(false), 180)
    const feedbackTimer = window.setTimeout(() => setFeedback(null), 700)
    if (reducedMotion()) {
      displayedLp.current = lp
      setDisplayLp(lp)
      return () => { window.clearTimeout(impactTimer); window.clearTimeout(feedbackTimer) }
    }

    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 300)
      const next = Math.round(from + (lp - from) * (1 - Math.pow(1 - progress, 3)))
      displayedLp.current = next
      setDisplayLp(next)
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(impactTimer); window.clearTimeout(feedbackTimer) }
  }, [hapticsEnabled, lp])

  const adjust = (amount: number) => {
    const applied = Math.max(0, lp + amount) - lp
    if (!applied) return
    onSoundLp(player, applied)
    onAdjust(amount)
  }

  return <article className={`score-duelist-panel ${player} ${isActive ? 'is-active' : ''} ${impact ? 'is-impact' : ''} ${visualFeedback ? feedback! < 0 ? 'is-damage' : 'is-heal' : ''}`} aria-label={`Zone de vie du joueur ${playerNumber}`}>
    {feedback !== null && <span className={`score-lp-float ${feedback < 0 ? 'loss' : 'gain'}`} aria-live="polite">{formatDelta(feedback)}</span>}
    {visualFeedback && feedback !== null && feedback < 0 && <i className="score-impact-wave" aria-hidden="true" />}
    <header className="score-duelist-top">
      <div><span>Joueur {playerNumber}</span>{isActive && <small>Actif</small>}</div>
      <div className="score-duelist-value"><strong>{displayLp}</strong><span>LP</span></div>
    </header>
    <p className={`score-last-change ${last === undefined ? 'empty' : last < 0 ? 'loss' : 'gain'}`}>{last === undefined ? 'Aucune variation' : `${formatDelta(last)} LP récemment`}</p>
    <div className="score-life-bar" role="progressbar" aria-label={`Points de vie du joueur ${playerNumber}`} aria-valuenow={lp} aria-valuemin={0} aria-valuemax={8000}><i style={{ width: `${Math.min(100, Math.max(0, lp) / 80)}%` }} /></div>
    <div className="score-lp-section"><span>Retirer des LP</span><div className="score-lp-grid">{lossAdjustments.map(amount => <LpActionButton key={amount} amount={amount} player={player} onPress={adjust} />)}</div></div>
    <div className="score-lp-section"><span>Ajouter des LP</span><div className="score-lp-grid">{gainAdjustments.map(amount => <LpActionButton key={amount} amount={amount} player={player} onPress={adjust} />)}</div></div>
    <button className="score-lp-custom" onClick={onCustom} aria-label={`Ajustement personnalisé des LP du joueur ${playerNumber}`}><SlidersHorizontal size={17} /> Ajustement personnalisé</button>
  </article>
}
