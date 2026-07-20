import { useId } from 'react'
import type { PlayerId } from '../types'

export type ScapeState = 'luxuriant' | 'stable' | 'arid' | 'devastated'

export function scapeStateFor(lp: number): ScapeState {
  if (lp <= 0) return 'devastated'
  if (lp < 3000) return 'arid'
  if (lp <= 6000) return 'stable'
  return 'luxuriant'
}

export function DuelScape({ player, lp, forceLuxuriant = false, decorative = false }: { player: PlayerId; lp: number; forceLuxuriant?: boolean; decorative?: boolean }) {
  const state = forceLuxuriant ? 'luxuriant' : scapeStateFor(lp)
  const gradientId = `scape-sky-${useId().replace(/:/g, '')}`
  const label = state === 'luxuriant' ? 'Paysage luxuriant' : state === 'stable' ? 'Paysage stable' : state === 'arid' ? 'Paysage aride' : 'Paysage dévasté'

  return <div className={`duel-scape ${player} scape-${state} ${decorative ? 'is-decorative' : ''}`} role="img" aria-label={label}>
    <svg viewBox="0 0 320 150" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1"><stop className="scape-sky-start" offset="0" /><stop className="scape-sky-end" offset="1" /></linearGradient></defs>
      <rect width="320" height="150" fill={`url(#${gradientId})`} />
      <g className="scape-clouds"><ellipse cx="58" cy="28" rx="28" ry="9" /><ellipse cx="82" cy="24" rx="23" ry="11" /><ellipse cx="248" cy="38" rx="34" ry="10" /><ellipse cx="276" cy="35" rx="20" ry="8" /></g>
      <path className="scape-hill-far" d="M0 88 45 61 92 79 143 47 194 78 250 50 320 82V150H0Z" />
      <path className="scape-hill-mid" d="M0 101 62 72 115 102 178 64 225 92 284 65 320 81V150H0Z" />
      <g className="scape-vegetation"><path d="M5 128c18-38 32-36 43 0M44 137c20-55 43-53 57 0M116 136c12-31 30-30 43 0M167 140c24-48 43-45 60 0M240 138c17-37 38-35 55 0M285 142c12-25 25-24 35 0" /><circle cx="35" cy="110" r="7" /><circle cx="92" cy="103" r="9" /><circle cx="202" cy="104" r="8" /><circle cx="271" cy="105" r="10" /></g>
      <path className="scape-foreground" d="M0 128c38-15 66 10 101-1 35-11 58 13 98 0 48-16 73 8 121-4V150H0Z" />
      <g className="scape-flowers"><circle cx="26" cy="132" r="2" /><circle cx="77" cy="140" r="2" /><circle cx="151" cy="132" r="2" /><circle cx="222" cy="140" r="2" /><circle cx="296" cy="131" r="2" /></g>
    </svg>
  </div>
}
