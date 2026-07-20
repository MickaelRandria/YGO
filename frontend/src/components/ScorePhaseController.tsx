import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Clock3, Flag, Volume2, VolumeX, X } from 'lucide-react'
import type { Phase, PlayerId } from '../types'

const phases: Phase[] = ['Draw', 'Standby', 'Main 1', 'Battle', 'Main 2', 'End']
const formatTime = (milliseconds: number) => `${Math.floor(milliseconds / 60000).toString().padStart(2, '0')}:${Math.floor(milliseconds / 1000 % 60).toString().padStart(2, '0')}`

export function ScorePhaseController({ turn, player, phase, turnStartedAt, timerEnabled, hapticsEnabled, onNext, onEndTurn, onSelectPhase, onToggleTimer, onToggleHaptics }: { turn: number; player: PlayerId; phase: Phase; turnStartedAt: number; timerEnabled: boolean; hapticsEnabled: boolean; onNext: () => void; onEndTurn: () => void; onSelectPhase: (phase: Phase) => void; onToggleTimer: () => void; onToggleHaptics: () => void }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const holdTimer = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const phaseIndex = phases.indexOf(phase)
  const next = phases[(phaseIndex + 1) % phases.length]
  const previous = phases[(phaseIndex + phases.length - 1) % phases.length]

  useEffect(() => {
    if (!timerEnabled) { setElapsed(0); return }
    const update = () => setElapsed(Date.now() - turnStartedAt)
    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [timerEnabled, turnStartedAt])

  const clearHold = () => { if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current); holdTimer.current = undefined }
  const beginHold = () => { held.current = false; holdTimer.current = window.setTimeout(() => { held.current = true; setPickerOpen(true) }, 550) }

  return <>
    <section className="score-duel-header">
      <div className="score-turn-meta"><span>Mode score</span><strong>Tour {turn} · J{player === 'p1' ? '1' : '2'} actif</strong></div>
      <div className="score-header-tools"><button className={`score-timer ${timerEnabled ? 'active' : ''}`} onClick={onToggleTimer} aria-pressed={timerEnabled}><Clock3 size={16} />{timerEnabled ? formatTime(elapsed) : 'Timer'}</button><button className={`score-sound ${hapticsEnabled ? 'active' : ''}`} onClick={onToggleHaptics} aria-pressed={hapticsEnabled} aria-label={hapticsEnabled ? 'Désactiver les vibrations' : 'Activer les vibrations'}>{hapticsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
    </section>
    <section className="score-phase-controller">
      <button className="score-phase-carousel" onClick={() => setPickerOpen(true)} aria-haspopup="dialog" aria-expanded={pickerOpen}><small>{previous}</small><strong>{phase}</strong><small>{next}</small></button>
      <div className="score-phase-actions"><button className="score-next-phase" onPointerDown={beginHold} onPointerUp={clearHold} onPointerCancel={clearHold} onClick={() => { if (!held.current) onNext() }} aria-label={`Phase suivante : ${next}`}><span><small>Passer à</small><strong>{next}</strong></span><ChevronRight size={18} /></button><button className="score-end-turn" onClick={onEndTurn}><Flag size={16} /><span>Fin de tour <small>vers {player === 'p1' ? 'J2' : 'J1'}</small></span></button></div>
      {pickerOpen && <div className="score-phase-picker" role="dialog" aria-label="Choisir une phase"><div><strong>Aller à une phase</strong><button onClick={() => setPickerOpen(false)} aria-label="Fermer le choix de phase"><X size={17} /></button></div><section>{phases.map(item => <button key={item} className={item === phase ? 'active' : ''} onClick={() => { onSelectPhase(item); setPickerOpen(false) }}>{item}</button>)}</section></div>}
    </section>
  </>
}
