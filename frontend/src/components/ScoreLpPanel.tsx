import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Shield, ShieldAlert, ShieldOff, Zap } from 'lucide-react'
import type { LpLog, PlayerId } from '../types'
import { Modal } from './Modal'

const adjustments = [-100, -500, -1000, -2000] as const
const stateFor = (lp: number) => lp <= 0 ? 'Éliminé' : lp < 3000 ? 'Critique' : lp <= 6000 ? 'Stable' : 'Dominant'
const iconFor = (lp: number) => lp <= 0 ? ShieldOff : lp < 3000 ? ShieldAlert : lp <= 6000 ? Shield : Zap
const formatDelta = (value: number) => `${value > 0 ? '+' : ''}${value}`

function ScorePlayerCard({ player, lp, last, activePlayer, onAdjust, onCustom }: { player: PlayerId; lp: number; last?: number; activePlayer: PlayerId; onAdjust: (amount: number) => void; onCustom: () => void }) {
  const previous = useRef(lp)
  const [displayLp, setDisplayLp] = useState(lp)
  const [feedback, setFeedback] = useState<number | null>(null)
  const [impact, setImpact] = useState(false)
  const Icon = iconFor(lp)
  const activeTurn = activePlayer === player
  useEffect(() => {
    const from = previous.current
    if (from === lp) return
    previous.current = lp
    setFeedback(lp - from)
    setImpact(true)
    const impactTimer = window.setTimeout(() => setImpact(false), 280)
    const feedbackTimer = window.setTimeout(() => setFeedback(null), 700)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplayLp(lp); return () => { window.clearTimeout(impactTimer); window.clearTimeout(feedbackTimer) } }
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => { const progress = Math.min(1, (now - started) / 280); setDisplayLp(Math.round(from + (lp - from) * (1 - Math.pow(1 - progress, 3)))); if (progress < 1) frame = window.requestAnimationFrame(tick) }
    frame = window.requestAnimationFrame(tick)
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(impactTimer); window.clearTimeout(feedbackTimer) }
  }, [lp])
  const adjust = (amount: number) => { if ('vibrate' in navigator) navigator.vibrate(10); onAdjust(amount) }
  return <article className={`score-lp-focused ${player} ${impact ? 'is-impact' : ''}`} key={player}>
    {feedback !== null && <span className={`score-lp-float ${feedback < 0 ? 'loss' : 'gain'}`} aria-live="polite">{formatDelta(feedback)}</span>}
    <header><div><span>Joueur {player === 'p1' ? '1' : '2'}</span><small>{activeTurn ? 'Tour actif' : `Joueur ${player === 'p1' ? '1' : '2'} au focus`}</small></div><span className="score-state" aria-label={`État ${stateFor(lp)}`}><Icon size={18} /><span>{stateFor(lp)}</span></span></header>
    <div className="score-lp-value"><strong>{displayLp}</strong><span>LP</span></div>
    <p className={`score-last-change ${last === undefined ? 'empty' : last < 0 ? 'loss' : 'gain'}`}>{last === undefined ? 'Dernière variation · aucune' : `Dernière variation · ${formatDelta(last)} LP`}</p>
    <div className="score-life-bar" role="progressbar" aria-label={`Points de vie du joueur ${player === 'p1' ? '1' : '2'}`} aria-valuenow={lp} aria-valuemin={0} aria-valuemax={8000}><i style={{ width: `${Math.min(100, Math.max(0, lp) / 80)}%` }} /></div>
    <div className="score-lp-controls">{adjustments.map(amount => <button key={amount} onClick={() => adjust(amount)}>{amount}</button>)}<button onClick={onCustom}>Ajustement personnalisé ±</button></div>
  </article>
}

export function ScoreLpPanel({ p1, p2, history, activePlayer, focusedPlayer, onFocus, onChange }: { p1: number; p2: number; history: LpLog[]; activePlayer: PlayerId; focusedPlayer: PlayerId; onFocus: (player: PlayerId) => void; onChange: (player: PlayerId, amount: number) => void }) {
  const [editing, setEditing] = useState<PlayerId | null>(null)
  const [amount, setAmount] = useState('')
  const opponent = focusedPlayer === 'p1' ? 'p2' : 'p1'
  const values = { p1, p2 }
  const focusedLast = history.find(item => item.player === focusedPlayer)?.difference
  const opponentLast = history.find(item => item.player === opponent)?.difference
  const gap = p1 - p2
  const apply = () => { const value = Number(amount); if (editing && Number.isFinite(value) && value) onChange(editing, value); setEditing(null); setAmount('') }
  return <section className="score-player-area">
    <ScorePlayerCard player={focusedPlayer} lp={values[focusedPlayer]} last={focusedLast} activePlayer={activePlayer} onAdjust={amount => onChange(focusedPlayer, amount)} onCustom={() => { setEditing(focusedPlayer); setAmount('-') }} />
    <button className={`score-opponent ${opponent}`} onClick={() => onFocus(opponent)} aria-label={`Prendre le focus sur le joueur ${opponent === 'p1' ? '1' : '2'}`}>
      <div><span>Joueur {opponent === 'p1' ? '1' : '2'}</span><small>{activePlayer === opponent ? 'Tour actif' : opponentLast === undefined ? 'Adversaire' : `${formatDelta(opponentLast)} LP récemment`}</small></div><strong>{values[opponent]} <small>LP</small></strong><div className="score-opponent-bar"><i style={{ width: `${Math.min(100, Math.max(0, values[opponent]) / 80)}%` }} /></div><ChevronRight size={20} aria-hidden="true" />
    </button>
    <div className="score-advantage" aria-live="polite"><span>J1</span><i className={gap === 0 ? 'equal' : gap > 0 ? 'p1' : 'p2'} /><span>J2</span><strong>{gap === 0 ? 'Égalité' : `Avantage J${gap > 0 ? '1' : '2'} · ${Math.abs(gap)} LP`}</strong></div>
    {editing && <Modal title={`Modifier les LP J${editing === 'p1' ? '1' : '2'}`} onClose={() => setEditing(null)}><div className="numpad"><input autoFocus inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ex. -1500 ou 500" /><button className="primary" onClick={apply}>Appliquer</button></div></Modal>}
  </section>
}
