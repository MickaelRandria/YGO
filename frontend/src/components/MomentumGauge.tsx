import type { CSSProperties } from 'react'

export function MomentumGauge({ p1, p2 }: { p1: number; p2: number }) {
  const total = p1 + p2
  const frontier = total > 0 ? Math.min(100, Math.max(0, p1 / total * 100)) : 50
  const gap = p1 - p2
  const label = gap === 0 ? 'Égalité' : `J${gap > 0 ? '1' : '2'} +${Math.abs(gap)}`
  const style = { '--momentum-frontier': `${frontier}%` } as CSSProperties

  return <section className="momentum-gauge" aria-label={`Momentum du duel : ${label}`}>
    <div className="momentum-track" style={style}><i className="momentum-j1" /><i className="momentum-j2" /><b aria-hidden="true" /></div>
    <small>{label}</small>
  </section>
}
