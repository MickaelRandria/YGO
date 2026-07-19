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
  return <div className={`lp-player ${id} state-${visual}`}><div className="lp-hero"><div className={`lp-hero-circle ${pulse ? 'pulse' : ''}`} aria-label={`État ${labelFor[visual]}`}><Icon size={46} strokeWidth={2.1} /></div></div><div className="lp-info"><span>{id === 'p1' ? 'Joueur 1' : 'Joueur 2'}</span><strong className={lpTone(lp)}>{lp}</strong><small className="lp-state-label">{labelFor[visual]}</small>{formatDelta(last) !== null && <small className={`lp-delta ${last! < 0 ? 'loss' : 'gain'}`}>{formatDelta(last)} LP</small>}<div className="life-bar"><i className={lpTone(lp)} style={{ width: `${Math.min(100, lp / 80)}%` }} /><b className="tick tick-half" /><b className="tick tick-quarter" /></div><div className="lp-actions"><button onClick={() => onChange(id, -100)}>-100</button><button onClick={() => onChange(id, -500)}>-500</button><button onClick={() => onChange(id, -1000)}>-1000</button><button onClick={() => onChange(id, -2000)}>-2000</button><button onClick={() => onEdit(id)}>−/+</button></div></div></div>
}

export function LpPanel({ p1, p2, history, onChange }: { p1: number; p2: number; history: LpLog[]; onChange: (player: PlayerId, amount: number) => void }) {
  const [editing, setEditing] = useState<PlayerId | null>(null)
  const [amount, setAmount] = useState('')
  const apply = () => { const value = Number(amount); if (editing && Number.isFinite(value) && value) onChange(editing, value); setEditing(null); setAmount('') }
  return <><section className="lp-panel"><LpPlayer id="p1" lp={p1} history={history} onChange={onChange} onEdit={player => { setEditing(player); setAmount('-') }} /><LpPlayer id="p2" lp={p2} history={history} onChange={onChange} onEdit={player => { setEditing(player); setAmount('-') }} /></section>{editing && <Modal title={`Modifier les LP ${editing === 'p1' ? 'J1' : 'J2'}`} onClose={() => setEditing(null)}><div className="numpad"><input autoFocus inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ex. -1500 ou 500" /><button className="primary" onClick={apply}>Appliquer</button></div></Modal>}</>
}
