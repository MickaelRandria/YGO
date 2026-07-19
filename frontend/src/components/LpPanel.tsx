import { useEffect, useState } from 'react'
import { Shield, ShieldAlert, ShieldOff, Zap } from 'lucide-react'
import type { LpLog, PlayerId } from '../types'
import { Modal } from './Modal'

type VisualState = 'dominant' | 'stable' | 'critical' | 'eliminated'
const visualFor = (lp: number): VisualState => lp <= 0 ? 'eliminated' : lp < 3000 ? 'critical' : lp <= 6000 ? 'stable' : 'dominant'
const iconFor = { dominant: Zap, stable: Shield, critical: ShieldAlert, eliminated: ShieldOff }
const labelFor = { dominant: 'Dominant', stable: 'Stable', critical: 'Critique', eliminated: 'Éliminé' }
function lpTone(lp: number) { return lp <= 2000 ? 'danger' : lp <= 4000 ? 'warning' : 'healthy' }
function formatDelta(value?: number) { return value === undefined ? null : `${value > 0 ? '+' : ''}${value}` }

function LpPlayer({ id, lp, history, onChange, onEdit }: { id: PlayerId; lp: number; history: LpLog[]; onChange: (player: PlayerId, amount: number) => void; onEdit: (player: PlayerId) => void }) {
  const currentVisual = visualFor(lp)
  const [visual, setVisual] = useState(currentVisual)
  const [pulse, setPulse] = useState(false)
  const Icon = iconFor[visual]
  const last = history.find(item => item.player === id)?.difference
  useEffect(() => {
    if (currentVisual === visual) return
    setVisual(currentVisual)
    setPulse(true)
    const timeout = window.setTimeout(() => setPulse(false), 420)
    return () => window.clearTimeout(timeout)
  }, [currentVisual, visual])
  return <article className={`lp-player ${id} state-${visual}`}>
    <header className="lp-player-header">
      <span>{id === 'p1' ? 'Joueur 1' : 'Joueur 2'}</span>
      <span className={`lp-state ${pulse ? 'pulse' : ''}`} role="status" aria-label={`État ${labelFor[visual]}`}>
        <Icon size={15} strokeWidth={2.2} />
        <small className="sr-only">{labelFor[visual]}</small>
      </span>
    </header>
    <div className="lp-value">
      <strong className={lpTone(lp)}>{lp}</strong>
      <span>LP</span>
    </div>
    <small className={`lp-delta ${last === undefined ? 'empty-delta' : last < 0 ? 'loss' : 'gain'}`}>
      {labelFor[visual]} · {last === undefined ? 'aucune variation' : `${formatDelta(last)} LP récemment`}
    </small>
    <div className="life-bar" role="progressbar" aria-label={`Points de vie du ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`} aria-valuenow={lp} aria-valuemin={0} aria-valuemax={8000}>
      <i className={lpTone(lp)} style={{ width: `${Math.min(100, Math.max(0, lp) / 80)}%` }} />
    </div>
    <div className="lp-actions" aria-label={`Modifier les points de vie du ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`}>
      <button onClick={() => onChange(id, -100)}>-100</button>
      <button onClick={() => onChange(id, -500)}>-500</button>
      <button onClick={() => onChange(id, -1000)}>-1000</button>
      <button onClick={() => onChange(id, -2000)}>-2000</button>
      <button onClick={() => onEdit(id)} aria-label={`Ajustement personnalisé des LP du ${id === 'p1' ? 'joueur 1' : 'joueur 2'}`}>−/+</button>
    </div>
  </article>
}

export function LpPanel({ p1, p2, history, onChange }: { p1: number; p2: number; history: LpLog[]; onChange: (player: PlayerId, amount: number) => void }) {
  const [editing, setEditing] = useState<PlayerId | null>(null)
  const [amount, setAmount] = useState('')
  const apply = () => { const value = Number(amount); if (editing && Number.isFinite(value) && value) onChange(editing, value); setEditing(null); setAmount('') }
  return <><section className="lp-panel"><LpPlayer id="p1" lp={p1} history={history} onChange={onChange} onEdit={player => { setEditing(player); setAmount('-') }} /><LpPlayer id="p2" lp={p2} history={history} onChange={onChange} onEdit={player => { setEditing(player); setAmount('-') }} /></section>{editing && <Modal title={`Modifier les LP ${editing === 'p1' ? 'J1' : 'J2'}`} onClose={() => setEditing(null)}><div className="numpad"><input autoFocus inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ex. -1500 ou 500" /><button className="primary" onClick={apply}>Appliquer</button></div></Modal>}</>
}
