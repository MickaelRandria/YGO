import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Clock3, Flag, Star, Volume2, VolumeX, X } from 'lucide-react'
import type { Phase, PlayerId } from '../types'

const phases: Phase[] = ['Draw', 'Standby', 'Main 1', 'Battle', 'Main 2', 'End']
const help: Record<Phase, string> = { Draw: 'Le joueur actif pioche 1 carte.', Standby: 'Résolution des effets pendant la Standby Phase.', 'Main 1': 'Invocation normale, poser des monstres, activer Magies/Pièges et invocations spéciales.', Battle: 'Déclarer des attaques. Pas au premier tour du J1.', 'Main 2': 'Comme Main 1, sauf invocation normale déjà utilisée.', End: 'Résoudre les effets de fin et défausser si plus de 6 cartes en main.' }
const formatTime = (milliseconds: number) => `${Math.floor(milliseconds / 60000).toString().padStart(2, '0')}:${Math.floor(milliseconds / 1000 % 60).toString().padStart(2, '0')}`

export function PhaseBar({ turn, player, phase, turnStartedAt, timerEnabled, hapticsEnabled, onNext, onEndTurn, onSelectPhase, onToggleTimer, onToggleHaptics, compact = false }: { turn: number; player: PlayerId; phase: Phase; turnStartedAt: number; timerEnabled: boolean; hapticsEnabled: boolean; onNext: () => void; onEndTurn: () => void; onSelectPhase: (phase: Phase) => void; onToggleTimer: () => void; onToggleHaptics: () => void; compact?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const holdTimer = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const phaseIndex = phases.indexOf(phase)
  const next = phases[(phaseIndex + 1) % phases.length]
  const previous = phases[(phaseIndex + phases.length - 1) % phases.length]
  useEffect(() => { if (!timerEnabled) { setElapsed(0); return } const update = () => setElapsed(Date.now() - turnStartedAt); update(); const id = window.setInterval(update, 1000); return () => window.clearInterval(id) }, [timerEnabled, turnStartedAt])
  const clearHold = () => { if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current); holdTimer.current = undefined }
  const beginHold = () => { held.current = false; holdTimer.current = window.setTimeout(() => { held.current = true; setPickerOpen(true) }, 550) }
  const finishHold = () => clearHold()
  return <section className={compact ? 'score-phase-wrap' : 'phase-wrap'}>
    <header className="phase-header">
      <div className="phase-turn">
        {compact && <span className="score-mode-label">Mode score</span>}<span className="turn">T{turn}</span><span className="player-pill">{player === 'p1' ? 'J1 actif' : 'J2 actif'}</span>{!compact && <span className="turn-stars" aria-label={`Tour ${turn}`}><span className="sr-only">Tour {turn}</span>{Array.from({ length: Math.min(turn, 5) }, (_, index) => <Star key={index} size={11} fill="currentColor" aria-hidden="true" />)}</span>}
      </div>
      <div className="phase-tools"><button className={`timer-button ${timerEnabled ? 'active' : ''}`} onClick={onToggleTimer} aria-pressed={timerEnabled}>
        <Clock3 size={16} />
        {timerEnabled ? formatTime(elapsed) : 'Timer'}
      </button><button className={`haptics-button ${hapticsEnabled ? 'active' : ''}`} onClick={onToggleHaptics} aria-pressed={hapticsEnabled} aria-label={hapticsEnabled ? 'Désactiver les sons et vibrations' : 'Activer les sons et vibrations'}>{hapticsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
    </header>

    <button className="phase-name" onClick={() => setPickerOpen(true)} aria-haspopup="dialog" aria-expanded={pickerOpen}>
      <span>Progression de phase</span>
      <span className="phase-carousel" key={phase}><small>{previous}</small><strong>{phase}</strong><small>{next}</small></span>
    </button>

    <div className="phase-actions">
      <button className="next-phase" onPointerDown={beginHold} onPointerUp={finishHold} onPointerCancel={finishHold} onClick={() => { if (!held.current) onNext() }} aria-label={`Phase suivante : ${next}`}>
        <span><small>Passer à</small><strong>{next}</strong></span>
        <ChevronRight size={18} />
      </button>
      <button className="end-turn" onClick={onEndTurn}>
        <Flag size={16} />
        <span>Fin de tour <small>vers {player === 'p1' ? 'J2' : 'J1'}</small></span>
      </button>
    </div>

    <p className="phase-help">{help[phase]}</p>

    {pickerOpen && <div className="phase-picker" role="dialog" aria-label="Choisir une phase">
      <div>
        <strong>Aller à une phase</strong>
        <button onClick={() => setPickerOpen(false)} aria-label="Fermer le choix de phase"><X size={17} /></button>
      </div>
      <section>{phases.map(item => <button key={item} className={item === phase ? 'active' : ''} onClick={() => { onSelectPhase(item); setPickerOpen(false) }}>{item}</button>)}</section>
    </div>}
  </section>
}
