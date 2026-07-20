import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpenCheck, Flag, RotateCcw, Settings2 } from 'lucide-react'
import type { Card, DuelState, EventPlayer, Phase, PlayerId, Zone } from '../types'
import { CardDetail } from '../components/CardDetail'
import { CardRow } from '../components/CardRow'
import { DuelScape } from '../components/DuelScape'
import { DuelJournal } from '../components/DuelJournal'
import { LpPanel } from '../components/LpPanel'
import { MomentumGauge } from '../components/MomentumGauge'
import { ScoreLpPanel } from '../components/ScoreLpPanel'
import { ScorePhaseController } from '../components/ScorePhaseController'
import { Modal } from '../components/Modal'
import { PhaseBar } from '../components/PhaseBar'
import { TurnTransition } from '../components/TurnTransition'
import { ZoneTabs } from '../components/ZoneTabs'
import { useDuelAudio } from '../hooks/useDuelAudio'

type Ending = { winner: PlayerId; reason: string }
const formatDuration = (milliseconds: number) => `${Math.floor(milliseconds / 60000)} min ${Math.floor(milliseconds / 1000 % 60).toString().padStart(2, '0')} s`

export function DuelScreen({ duel, scoreMode = false, onNext, onEndTurn, onSelectPhase, onToggleTimer, onLp, onMove, onAddEvent, onOpenLookup, onRematch, onNewDuel }: { duel: DuelState; scoreMode?: boolean; onNext: () => void; onEndTurn: () => void; onSelectPhase: (phase: Phase) => void; onToggleTimer: () => void; onLp: (player: PlayerId, amount: number) => void; onMove: (player: PlayerId, from: Zone, to: Zone, id: number) => void; onAddEvent: (player: EventPlayer, content: string) => void; onOpenLookup: () => void; onRematch: () => void; onNewDuel: () => void }) {
  const [player, setPlayer] = useState<PlayerId>('p1')
  const [zone, setZone] = useState<Zone>('deck')
  const [card, setCard] = useState<Card | null>(null)
  const [summary, setSummary] = useState<Ending | null>(null)
  const [victory, setVictory] = useState<Ending | null>(null)
  const [manualWinner, setManualWinner] = useState<PlayerId>('p1')
  const [manualReason, setManualReason] = useState('Concession')
  const [showManual, setShowManual] = useState(false)
  const [showSummaryJournal, setShowSummaryJournal] = useState(false)
  const [hapticsEnabled, setHapticsEnabled] = useState(() => typeof window === 'undefined' || window.localStorage.getItem('ygo-referee-haptics') !== 'false')
  const defeatedRef = useRef<PlayerId | null>(null)
  const { playLpChange, playPhaseChange, playTurnChange, playCardInteraction } = useDuelAudio(hapticsEnabled)
  const active = duel.players[player]
  const playerZones = active.zones
  const defeated = useMemo(() => (duel.players.p1.lp <= 0 ? 'p1' : duel.players.p2.lp <= 0 ? 'p2' : null), [duel.players])
  const momentum = Math.max(-1, Math.min(1, (duel.players.p1.lp - duel.players.p2.lp) / 8000))
  const criticalPlayer = duel.players.p1.lp < 2000 && duel.players.p2.lp < 2000 ? duel.players.p1.lp <= duel.players.p2.lp ? 'p1' : 'p2' : duel.players.p1.lp < 2000 ? 'p1' : duel.players.p2.lp < 2000 ? 'p2' : null
  const atmosphere = criticalPlayer ? `${criticalPlayer} critical` : momentum > .3 ? 'p1' : momentum < -.3 ? 'p2' : 'neutral'

  useEffect(() => { window.localStorage.setItem('ygo-referee-haptics', String(hapticsEnabled)) }, [hapticsEnabled])
  useEffect(() => {
    if (!defeated) { defeatedRef.current = null; return }
    if (defeatedRef.current === defeated) return
    defeatedRef.current = defeated
    const result = { winner: defeated === 'p1' ? 'p2' : 'p1', reason: 'LP à 0' } satisfies Ending
    setVictory(result)
    const timeout = window.setTimeout(() => { setSummary(result); setVictory(null) }, 800)
    return () => window.clearTimeout(timeout)
  }, [defeated])

  const finishVictory = () => { if (victory) { setSummary(victory); setVictory(null) } }
  const nextPlayer = duel.activePlayer === 'p1' ? 'p2' : 'p1'
  const handleNextPhase = () => {
    if (duel.phase === 'End') playTurnChange(duel.activePlayer, nextPlayer)
    else playPhaseChange()
    onNext()
  }
  const handleEndTurn = () => {
    playTurnChange(duel.activePlayer, nextPlayer)
    onEndTurn()
  }
  const handleSelectPhase = (phase: Phase) => {
    if (phase !== duel.phase) playPhaseChange()
    onSelectPhase(phase)
  }
  const openLookup = () => {
    playCardInteraction('verify')
    onOpenLookup()
  }
  const phaseProps = { turn: duel.turn, player: duel.activePlayer, phase: duel.phase, turnStartedAt: duel.turnStartedAt, timerEnabled: duel.timerEnabled, hapticsEnabled, onNext: handleNextPhase, onEndTurn: handleEndTurn, onSelectPhase: handleSelectPhase, onToggleTimer, onToggleHaptics: () => setHapticsEnabled(current => !current) }
  const common = scoreMode
    ? <><ScorePhaseController {...phaseProps} /><ScoreLpPanel p1={duel.players.p1.lp} p2={duel.players.p2.lp} history={duel.lpHistory} activePlayer={duel.activePlayer} hapticsEnabled={hapticsEnabled} onChange={onLp} onSoundLp={playLpChange} /><div className="duel-quick-actions"><button onClick={openLookup}><BookOpenCheck size={16} /> Vérifier une carte</button><button onClick={() => setShowManual(true)}><Flag size={16} /> Terminer le duel</button></div></>
    : <><PhaseBar {...phaseProps} /><MomentumGauge p1={duel.players.p1.lp} p2={duel.players.p2.lp} /><LpPanel p1={duel.players.p1.lp} p2={duel.players.p2.lp} history={duel.lpHistory} activePlayer={duel.activePlayer} hapticsEnabled={hapticsEnabled} onChange={onLp} onSoundLp={playLpChange} /><div className="duel-quick-actions"><button onClick={openLookup}><BookOpenCheck size={16} /> Vérifier une carte</button><button onClick={() => setShowManual(true)}><Flag size={16} /> Terminer le duel</button></div></>

  if (summary) return <main className="screen duel-summary"><section className={`winner-hero ${summary.winner}`}><DuelScape player={summary.winner} lp={8000} forceLuxuriant /><div className="winner-copy"><span>Victoire</span><h1>Joueur {summary.winner === 'p1' ? '1' : '2'}</h1><p>{summary.reason}</p></div></section><section className="summary-grid"><div><span>Durée</span><strong>{formatDuration(Date.now() - duel.startedAt)}</strong></div><div><span>Tours joués</span><strong>{duel.turn}</strong></div><div><span>LP Joueur 1</span><strong>{duel.players.p1.lp}</strong></div><div><span>LP Joueur 2</span><strong>{duel.players.p2.lp}</strong></div></section><button className="secondary summary-journal" onClick={() => setShowSummaryJournal(current => !current)}><Settings2 size={16} /> {showSummaryJournal ? 'Masquer le journal' : 'Consulter le journal complet'}</button>{showSummaryJournal && <DuelJournal events={duel.events} onAdd={onAddEvent} />}<button className="primary" onClick={onRematch}><RotateCcw size={18} /> Revanche</button><button className="secondary summary-new" onClick={onNewDuel}>Nouveau duel</button></main>

  return <main className={`screen duel-screen ${scoreMode ? 'score-duel' : ''} atmosphere-${atmosphere} ${victory ? `victory-${victory.winner}` : ''}`}><div className="duel-arena-atmosphere" aria-hidden="true" />{criticalPlayer && <div className={`critical-zone ${criticalPlayer}`} aria-hidden="true" />}{victory && <button className={`victory-impact ${victory.winner}`} onClick={finishVictory} aria-label="Passer directement au résumé de victoire"><span>Fin du duel</span></button>}<TurnTransition activePlayer={duel.activePlayer} turn={duel.turn} />{common}{!scoreMode && playerZones && <><div className="player-switch"><button className={player === 'p1' ? 'active' : ''} onClick={() => setPlayer('p1')}>Joueur 1</button><button className={player === 'p2' ? 'active' : ''} onClick={() => setPlayer('p2')}>Joueur 2</button></div><ZoneTabs zones={playerZones} selected={zone} onChange={setZone} /><section className="zone-content"><div className="section-title"><h2>{zone === 'hand' ? 'Main' : zone === 'field' ? 'Terrain' : zone === 'graveyard' ? 'Cimetière' : zone === 'banished' ? 'Banni' : zone[0].toUpperCase() + zone.slice(1)}</h2><span>{playerZones[zone].length} cartes</span></div>{playerZones[zone].length ? playerZones[zone].map((item, index) => <CardRow key={`${item.id}-${index}`} card={item} onClick={() => setCard(item)} />) : <p className="empty">Zone vide.</p>}</section>{card && <CardDetail card={card} zone={zone} onClose={() => setCard(null)} onMove={to => { playCardInteraction('place'); onMove(player, zone, to, card.id); setCard(null) }} />}</>}<DuelJournal events={duel.events} onAdd={onAddEvent} />{showManual && <Modal title="Terminer le duel" onClose={() => setShowManual(false)}><div className="manual-end"><label>Vainqueur<select value={manualWinner} onChange={event => setManualWinner(event.target.value as PlayerId)}><option value="p1">Joueur 1</option><option value="p2">Joueur 2</option></select></label><label>Raison<input value={manualReason} onChange={event => setManualReason(event.target.value)} placeholder="Concession, deck out, effet…" /></label><button className="primary" onClick={() => { setSummary({ winner: manualWinner, reason: manualReason.trim() || 'Victoire déclarée' }); setShowManual(false) }}>Terminer le duel</button></div></Modal>}</main>
}
