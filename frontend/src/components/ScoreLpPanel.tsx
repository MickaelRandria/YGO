import { useState } from 'react'
import type { LpLog, PlayerId } from '../types'
import { DuelBalanceIndicator } from './DuelBalanceIndicator'
import { Modal } from './Modal'
import { ScoreDuelistPanel } from './ScoreDuelistPanel'

export function ScoreLpPanel({ p1, p2, history, activePlayer, hapticsEnabled, onChange }: { p1: number; p2: number; history: LpLog[]; activePlayer: PlayerId; hapticsEnabled: boolean; onChange: (player: PlayerId, amount: number) => void }) {
  const [editing, setEditing] = useState<PlayerId | null>(null)
  const [amount, setAmount] = useState('')
  const p1Last = history.find(item => item.player === 'p1')?.difference
  const p2Last = history.find(item => item.player === 'p2')?.difference
  const openCustom = (player: PlayerId) => { setEditing(player); setAmount('-') }
  const apply = () => {
    const value = Number(amount)
    if (editing && Number.isFinite(value) && value) onChange(editing, value)
    setEditing(null)
    setAmount('')
  }

  return <section className="score-player-area">
    <ScoreDuelistPanel player="p1" lp={p1} last={p1Last} activePlayer={activePlayer} hapticsEnabled={hapticsEnabled} onAdjust={amount => onChange('p1', amount)} onCustom={() => openCustom('p1')} />
    <ScoreDuelistPanel player="p2" lp={p2} last={p2Last} activePlayer={activePlayer} hapticsEnabled={hapticsEnabled} onAdjust={amount => onChange('p2', amount)} onCustom={() => openCustom('p2')} />
    <DuelBalanceIndicator p1={p1} p2={p2} />
    {editing && <Modal title={`Modifier les LP J${editing === 'p1' ? '1' : '2'}`} onClose={() => setEditing(null)}><div className="numpad"><input autoFocus inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ex. -1500 ou 500" /><button className="primary" onClick={apply}>Appliquer</button></div></Modal>}
  </section>
}
