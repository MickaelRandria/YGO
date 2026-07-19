import { useState } from 'react'
import type { LpLog, PlayerId } from '../types'
import { Modal } from './Modal'

function lpTone(lp: number) { return lp <= 2000 ? 'danger' : lp <= 4000 ? 'warning' : 'healthy' }
function formatDelta(value?: number) { return value === undefined ? null : `${value > 0 ? '+' : ''}${value}` }

export function LpPanel({ p1, p2, history, onChange }: { p1: number; p2: number; history: LpLog[]; onChange: (player: PlayerId, amount: number) => void }) {
  const [editing, setEditing] = useState<PlayerId | null>(null)
  const [amount, setAmount] = useState('')
  const apply = () => { const value = Number(amount); if (editing && Number.isFinite(value) && value) onChange(editing, value); setEditing(null); setAmount('') }
  const last = (player: PlayerId) => history.find(item => item.player === player)?.difference
  return <><section className="lp-panel">{([{ id: 'p1', lp: p1, label: 'Joueur 1' }, { id: 'p2', lp: p2, label: 'Joueur 2' }] as const).map(player => <div key={player.id} className="lp-player"><span>{player.label}</span><strong className={lpTone(player.lp)}>{player.lp}</strong>{formatDelta(last(player.id)) !== null && <small className={`lp-delta ${last(player.id)! < 0 ? 'loss' : 'gain'}`}>{formatDelta(last(player.id))} LP</small>}<div className="life-bar"><i className={lpTone(player.lp)} style={{ width: `${Math.min(100, player.lp / 80)}%` }} /><b className="tick tick-half" /><b className="tick tick-quarter" /></div><div className="lp-actions"><button onClick={() => onChange(player.id, -100)}>-100</button><button onClick={() => onChange(player.id, -500)}>-500</button><button onClick={() => onChange(player.id, -1000)}>-1000</button><button onClick={() => onChange(player.id, -2000)}>-2000</button><button onClick={() => { setEditing(player.id); setAmount('-') }}>−/+</button></div></div>)}</section>{editing && <Modal title={`Modifier les LP ${editing === 'p1' ? 'J1' : 'J2'}`} onClose={() => setEditing(null)}><div className="numpad"><input autoFocus inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ex. -1500 ou 500" /><button className="primary" onClick={apply}>Appliquer</button></div></Modal>}</>
}
