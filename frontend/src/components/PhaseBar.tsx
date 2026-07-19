import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Clock3 } from 'lucide-react'
import type { Phase, PlayerId } from '../types'

const phases: Phase[] = ['Draw', 'Standby', 'Main 1', 'Battle', 'Main 2', 'End']
const help: Record<Phase, string> = { Draw: 'Le joueur actif pioche 1 carte.', Standby: 'Résolution des effets pendant la Standby Phase.', 'Main 1': 'Invocation normale, poser des monstres, activer Magies/Pièges et invocations spéciales.', Battle: 'Déclarer des attaques. Pas au premier tour du J1.', 'Main 2': 'Comme Main 1, sauf invocation normale déjà utilisée.', End: 'Résoudre les effets de fin et défausser si plus de 6 cartes en main.' }
const formatTime = (milliseconds: number) => `${Math.floor(milliseconds / 60000).toString().padStart(2, '0')}:${Math.floor(milliseconds / 1000 % 60).toString().padStart(2, '0')}`

export function PhaseBar({ turn, player, phase, turnStartedAt, timerEnabled, onNext, onEndTurn, onSelectPhase, onToggleTimer }: { turn: number; player: PlayerId; phase: Phase; turnStartedAt: number; timerEnabled: boolean; onNext: () => void; onEndTurn: () => void; onSelectPhase: (phase: Phase) => void; onToggleTimer: () => void }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const holdTimer = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const next = phases[(phases.indexOf(phase) + 1) % phases.length]
  useEffect(() => { if (!timerEnabled) { setElapsed(0); return } const update = () => setElapsed(Date.now() - turnStartedAt); update(); const id = window.setInterval(update, 1000); return () => window.clearInterval(id) }, [timerEnabled, turnStartedAt])
  const clearHold = () => { if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current); holdTimer.current = undefined }
  const beginHold = () => { held.current = false; holdTimer.current = window.setTimeout(() => { held.current = true; setPickerOpen(true) }, 550) }
  const finishHold = () => clearHold()
  return <div className="phase-wrap"><div className="phase-bar"><span className="turn">T{turn}</span><span className="player-pill">{player === 'p1' ? 'J1 actif' : 'J2 actif'}</span><button className="phase-name" onClick={() => setPickerOpen(true)} title="Choisir une phase">{phase}</button><button className="next-phase" onPointerDown={beginHold} onPointerUp={finishHold} onPointerCancel={finishHold} onClick={() => { if (!held.current) onNext() }} aria-label={`Phase suivante : ${next}`}><ChevronRight size={17} /><small>{next}</small></button></div><div className="phase-actions"><button className={`timer-button ${timerEnabled ? 'active' : ''}`} onClick={onToggleTimer}><Clock3 size={14} />{timerEnabled ? formatTime(elapsed) : 'Timer'}</button><button className="end-turn" onClick={onEndTurn}>Fin de tour → {player === 'p1' ? 'J2' : 'J1'}</button></div><p className="phase-help">{help[phase]}</p>{pickerOpen && <div className="phase-picker" role="dialog" aria-label="Choisir une phase"><div><strong>Aller à une phase</strong><button onClick={() => setPickerOpen(false)}>×</button></div><section>{phases.map(item => <button key={item} className={item === phase ? 'active' : ''} onClick={() => { onSelectPhase(item); setPickerOpen(false) }}>{item}</button>)}</section></div>}</div>
}
