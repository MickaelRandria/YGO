import type { CSSProperties } from 'react'

export function DuelBalanceIndicator({ p1, p2 }: { p1: number; p2: number }) {
  const total = p1 + p2
  const frontier = total > 0 ? Math.min(100, Math.max(0, p1 / total * 100)) : 50
  const gap = p1 - p2
  const label = gap === 0 ? 'Égalité parfaite' : `Avantage J${gap > 0 ? '1' : '2'} · ${Math.abs(gap)} LP`
  const style = { '--balance-frontier': `${frontier}%` } as CSSProperties

  return <section className="score-balance" aria-label={`Équilibre du duel : ${label}`}>
    <div className="score-balance-head"><span>Équilibre du duel</span><strong>{label}</strong></div>
    <div className="score-balance-track" style={style} aria-hidden="true"><i className="score-balance-p1" /><i className="score-balance-p2" /><b /></div>
  </section>
}
