import { useEffect, useRef, useState } from 'react'
import type { LpLog, PlayerId } from '../types'
import { DuelScape } from './DuelScape'
import { Modal } from './Modal'

type VisualState = 'dominant' | 'stable' | 'critical' | 'eliminated'
const visualFor = (lp: number): VisualState => lp <= 0 ? 'eliminated' : lp < 3000 ? 'critical' : lp <= 6000 ? 'stable' : 'dominant'
const labelFor = { dominant: 'Dominant', stable: 'Stable', critical: 'Critique', eliminated: 'Éliminé' }
const lpTone = (lp: number) => lp <= 2000 ? 'danger' : lp <= 4000 ? 'warning' : 'healthy'
const formatDelta = (value: number) => `${value > 0 ? '+' : ''}${value}`
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const lossAdjustments = [-100, -500, -1000, -2000] as const
const gainAdjustments = [100, 500, 1000, 2000] as const
const compactAmount = (value: number) => `${value > 0 ? '+' : '-'}${Math.abs(value) >= 1000 ? `${Math.abs(value) / 1000}K` : Math.abs(value)}`

function LpPlayer({ id, lp, history, active, hapticsEnabled, onChange, onEdit, onSoundLp }: { id: PlayerId; lp: number; history: LpLog[]; active: boolean; hapticsEnabled: boolean; onChange: (player: PlayerId, amount: number) => void; onEdit: (player: PlayerId) => void; onSoundLp: (player: PlayerId, amount: number) => void }) {
  const visual = visualFor(lp)
  const previousLp = useRef(lp)
  const frame = useRef<number | null>(null)
  const [displayLp, setDisplayLp] = useState(lp)
  const [feedback, setFeedback] = useState<number | null>(null)
  const [impact, setImpact] = useState(false)
  const last = history.find(item => item.player === id)?.difference
  const visualFeedback = feedback !== null && !reducedMotion()

  useEffect(() => {
    const from = previousLp.current
    if (from === lp) return
    previousLp.current = lp
    const difference = lp - from
    setFeedback(difference)
    setImpact(!reducedMotion())
    if (difference < 0 && hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(Math.abs(difference) >= 2000 ? [30, 40, 30] : Math.abs(difference) >= 1000 ? 30 : 15)
    const impactTimer = window.setTimeout(() => setImpact(false), 280)
    const feedbackTimer = window.setTimeout(() => setFeedback(null), 700)
    if (reducedMotion()) {
      setDisplayLp(lp)
      return () => { window.clearTimeout(impactTimer); window.clearTimeout(feedbackTimer) }
    }
    const started = performance.now()
    const animate = (now: number) => {
      const progress = Math.min(1, (now - started) / 280)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayLp(Math.round(from + (lp - from) * eased))
      if (progress < 1) frame.current = window.requestAnimationFrame(animate)
    }
    frame.current = window.requestAnimationFrame(animate)
    return () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
      window.clearTimeout(impactTimer)
      window.clearTimeout(feedbackTimer)
    }
  }, [hapticsEnabled, lp])

  const adjust = (amount: number) => {
    const applied = Math.max(0, lp + amount) - lp
    if (!applied) return
    onSoundLp(id, applied)
    onChange(id, amount)
  }

  return <article className={`lp-player ${id} state-${visual} ${active ? 'is-active' : 'is-inactive'} ${impact ? 'is-impact' : ''} ${visualFeedback ? feedback < 0 ? `is-damage damage-${Math.abs(feedback) >= 2000 ? 'heavy' : Math.abs(feedback) >= 1000 ? 'medium' : 'light'}` : 'is-heal' : ''}`} aria-current={active ? 'true' : undefined}>
    {feedback !== null && <span className={`lp-float ${feedback < 0 ? 'loss' : 'gain'}`} aria-live="polite">{formatDelta(feedback)}</span>}
    {visualFeedback && feedback !== null && feedback < 0 && <i className="lp-impact-wave" aria-hidden="true" />}
    <header className="lp-player-header">
      <span>{id === 'p1' ? 'Joueur 1' : 'Joueur 2'}</span>
      {active && <small className="active-label">Actif</small>}
      <span className="lp-state" role="status" aria-label={`État ${labelFor[visual]}`}><small>{labelFor[visual]}</small></span>
    </header>
    <DuelScape player={id} lp={lp} />
    <div className="lp-value"><strong className={lpTone(lp)}>{displayLp}</strong><span>LP</span></div>
    <small className={`lp-delta ${last === undefined ? 'empty-delta' : last < 0 ? 'loss' : 'gain'}`}>{labelFor[visual]} · {last === undefined ? 'aucune variation' : `${formatDelta(last)} LP récemment`}</small>
    <div className="life-bar" role="progressbar" aria-label={`Points de vie du ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`} aria-valuenow={lp} aria-valuemin={0} aria-valuemax={8000}><i className={lpTone(lp)} style={{ width: `${Math.min(100, Math.max(0, lp) / 80)}%` }} /></div>
    <div className="lp-actions" aria-label={`Modifier les points de vie du ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`}>
      <div className="lp-action-row" aria-label="Raccourcis de perte de LP">{lossAdjustments.map(amount => <button key={amount} onClick={() => adjust(amount)} aria-label={`Retirer ${Math.abs(amount)} LP au ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`}>{compactAmount(amount)}</button>)}</div>
      <div className="lp-action-row" aria-label="Raccourcis de gain de LP">{gainAdjustments.map(amount => <button className="lp-gain" key={amount} onClick={() => adjust(amount)} aria-label={`Ajouter ${amount} LP au ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`}>{compactAmount(amount)}</button>)}</div>
      <button onClick={() => onEdit(id)} aria-label={`Ajustement personnalisé des LP du ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`}>±</button>
    </div>
  </article>
}

export function LpPanel({ p1, p2, history, activePlayer, hapticsEnabled, onChange, onSoundLp }: { p1: number; p2: number; history: LpLog[]; activePlayer: PlayerId; hapticsEnabled: boolean; onChange: (player: PlayerId, amount: number) => void; onSoundLp: (player: PlayerId, amount: number) => void }) {
  const [editing, setEditing] = useState<PlayerId | null>(null)
  const [amount, setAmount] = useState('')
  const apply = () => {
    const value = Number(amount)
    if (editing && Number.isFinite(value) && value) {
      const current = editing === 'p1' ? p1 : p2
      const applied = Math.max(0, current + value) - current
      if (applied) {
        onSoundLp(editing, applied)
        onChange(editing, value)
      }
    }
    setEditing(null)
    setAmount('')
  }
  return <><section className={`lp-panel arena-stage active-${activePlayer}`}>
    <LpPlayer id="p1" lp={p1} history={history} active={activePlayer === 'p1'} hapticsEnabled={hapticsEnabled} onChange={onChange} onEdit={player => { setEditing(player); setAmount('-') }} onSoundLp={onSoundLp} />
    <LpPlayer id="p2" lp={p2} history={history} active={activePlayer === 'p2'} hapticsEnabled={hapticsEnabled} onChange={onChange} onEdit={player => { setEditing(player); setAmount('-') }} onSoundLp={onSoundLp} />
  </section>{editing && <Modal title={`Modifier les LP ${editing === 'p1' ? 'J1' : 'J2'}`} onClose={() => setEditing(null)}><div className="numpad"><input autoFocus inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ex. -1500 ou 500" /><button className="primary" onClick={apply}>Appliquer</button></div></Modal>}</>
}
