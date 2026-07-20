import { useEffect, useRef, useState } from 'react'
import type { LpLog, PlayerId } from '../types'
import { Modal } from './Modal'

const lossAdjustments = [-100, -500, -1000, -2000] as const
const gainAdjustments = [100, 500, 1000, 2000] as const
const formatDelta = (value: number) => `${value > 0 ? '+' : ''}${value}`

function CompactLpPlayerCard({ player, lp, last, activePlayer, onAdjust, onCustom }: { player: PlayerId; lp: number; last?: number; activePlayer: PlayerId; onAdjust: (amount: number) => void; onCustom: () => void }) {
  const previous = useRef(lp)
  const [displayLp, setDisplayLp] = useState(lp)
  const [feedback, setFeedback] = useState<number | null>(null)
  const [impact, setImpact] = useState(false)
  const activeTurn = activePlayer === player

  useEffect(() => {
    const from = previous.current
    if (from === lp) return
    previous.current = lp
    setFeedback(lp - from)
    setImpact(true)
    const impactTimer = window.setTimeout(() => setImpact(false), 180)
    const feedbackTimer = window.setTimeout(() => setFeedback(null), 700)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayLp(lp)
      return () => { window.clearTimeout(impactTimer); window.clearTimeout(feedbackTimer) }
    }
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 300)
      setDisplayLp(Math.round(from + (lp - from) * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(impactTimer); window.clearTimeout(feedbackTimer) }
  }, [lp])

  const adjust = (amount: number) => {
    if ('vibrate' in navigator) navigator.vibrate(10)
    onAdjust(amount)
  }

  return <article className={`score-lp-player ${player} ${impact ? 'is-impact' : ''}`}>
    {feedback !== null && <span className={`score-lp-float ${feedback < 0 ? 'loss' : 'gain'}`} aria-live="polite">{formatDelta(feedback)}</span>}
    <header>
      <span>Joueur {player === 'p1' ? '1' : '2'}</span>
      {activeTurn && <small>Actif</small>}
    </header>
    <div className="score-lp-value"><strong>{displayLp}</strong><span>LP</span></div>
    <p className={`score-last-change ${last === undefined ? 'empty' : last < 0 ? 'loss' : 'gain'}`}>{last === undefined ? 'Aucune variation' : `${formatDelta(last)} LP`}</p>
    <div className="score-life-bar" role="progressbar" aria-label={`Points de vie du joueur ${player === 'p1' ? '1' : '2'}`} aria-valuenow={lp} aria-valuemin={0} aria-valuemax={8000}><i style={{ width: `${Math.min(100, Math.max(0, lp) / 80)}%` }} /></div>
    <div className="score-lp-controls">
      <div className="score-lp-row" aria-label="Raccourcis de perte de LP">{lossAdjustments.map(amount => <button key={amount} onClick={() => adjust(amount)} aria-label={`Retirer ${Math.abs(amount)} LP au joueur ${player === 'p1' ? '1' : '2'}`}>{amount}</button>)}</div>
      <div className="score-lp-row" aria-label="Raccourcis de gain de LP">{gainAdjustments.map(amount => <button className="score-lp-gain" key={amount} onClick={() => adjust(amount)} aria-label={`Ajouter ${amount} LP au joueur ${player === 'p1' ? '1' : '2'}`}>+{amount}</button>)}</div>
      <button className="score-lp-custom" onClick={onCustom} aria-label={`Ajuster librement les LP du joueur ${player === 'p1' ? '1' : '2'}`}>±</button>
    </div>
  </article>
}

export function ScoreLpPanel({ p1, p2, history, activePlayer, onChange }: { p1: number; p2: number; history: LpLog[]; activePlayer: PlayerId; onChange: (player: PlayerId, amount: number) => void }) {
  const [editing, setEditing] = useState<PlayerId | null>(null)
  const [amount, setAmount] = useState('')
  const p1Last = history.find(item => item.player === 'p1')?.difference
  const p2Last = history.find(item => item.player === 'p2')?.difference
  const gap = p1 - p2
  const apply = () => {
    const value = Number(amount)
    if (editing && Number.isFinite(value) && value) onChange(editing, value)
    setEditing(null)
    setAmount('')
  }

  return <section className="score-player-area">
    <div className="score-dual-arena">
      <CompactLpPlayerCard player="p1" lp={p1} last={p1Last} activePlayer={activePlayer} onAdjust={amount => onChange('p1', amount)} onCustom={() => { setEditing('p1'); setAmount('-') }} />
      <CompactLpPlayerCard player="p2" lp={p2} last={p2Last} activePlayer={activePlayer} onAdjust={amount => onChange('p2', amount)} onCustom={() => { setEditing('p2'); setAmount('-') }} />
    </div>
    <div className="score-advantage" aria-live="polite"><span>J1</span><i className={gap === 0 ? 'equal' : gap > 0 ? 'p1' : 'p2'} /><span>J2</span><strong>{gap === 0 ? `Égalité · ${p1} LP` : `Avantage J${gap > 0 ? '1' : '2'} · +${Math.abs(gap)} LP`}</strong></div>
    {editing && <Modal title={`Modifier les LP J${editing === 'p1' ? '1' : '2'}`} onClose={() => setEditing(null)}><div className="numpad"><input autoFocus inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ex. -1500 ou 500" /><button className="primary" onClick={apply}>Appliquer</button></div></Modal>}
  </section>
}
