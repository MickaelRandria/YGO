import { useEffect, useRef, useState } from 'react'
import type { PlayerId } from '../types'

type TurnAnnouncement = { player: PlayerId; turn: number }

function OriginalCardBack() {
  return <svg className="turn-card-emblem" viewBox="0 0 120 168" aria-hidden="true">
    <rect x="7" y="7" width="106" height="154" rx="13" fill="none" stroke="currentColor" strokeWidth="7" />
    <rect x="18" y="18" width="84" height="132" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M60 38 75 60 60 82 45 60ZM34 84l18 10-8 22-18-10Zm52 0 18 10-10 22-18-10ZM60 91l18 25-18 22-18-22Z" fill="currentColor" />
    <circle cx="60" cy="84" r="8" fill="var(--bg-app)" />
    <path d="M35 128h50M44 137h32" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
  </svg>
}

export function TurnTransition({ activePlayer, turn }: { activePlayer: PlayerId; turn: number }) {
  const previousPlayer = useRef(activePlayer)
  const [announcement, setAnnouncement] = useState<TurnAnnouncement | null>(null)

  useEffect(() => {
    if (previousPlayer.current === activePlayer) return
    previousPlayer.current = activePlayer
    setAnnouncement({ player: activePlayer, turn })
    const timeout = window.setTimeout(() => setAnnouncement(null), 760)
    return () => window.clearTimeout(timeout)
  }, [activePlayer, turn])

  if (!announcement) return null
  const playerNumber = announcement.player === 'p1' ? '1' : '2'
  return <div className={`turn-transition ${announcement.player}`} role="status" aria-live="polite">
    <div className="turn-flip-card" key={`${announcement.player}-${announcement.turn}`}>
      <div className="turn-card-face turn-card-back"><OriginalCardBack /></div>
      <div className="turn-card-face turn-card-front"><span>Tour {announcement.turn}</span><strong>Joueur {playerNumber}</strong><small>À vous de jouer</small></div>
    </div>
  </div>
}
