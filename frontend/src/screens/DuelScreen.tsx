import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, Flag, RotateCcw, Settings2 } from 'lucide-react'
import type { Card, DuelState, EventPlayer, Phase, PlayerId, Zone } from '../types'
import { CardDetail } from '../components/CardDetail'
import { CardRow } from '../components/CardRow'
import { DuelJournal } from '../components/DuelJournal'
import { LpPanel } from '../components/LpPanel'
import { Modal } from '../components/Modal'
import { PhaseBar } from '../components/PhaseBar'
import { ZoneTabs } from '../components/ZoneTabs'

type Ending = { winner: PlayerId; reason: string }
const formatDuration = (milliseconds: number) => `${Math.floor(milliseconds / 60000)} min ${Math.floor(milliseconds / 1000 % 60).toString().padStart(2, '0')} s`

export function DuelScreen({ duel, scoreMode = false, onNext, onEndTurn, onSelectPhase, onToggleTimer, onLp, onMove, onAddEvent, onOpenLookup, onRematch, onNewDuel }: { duel: DuelState; scoreMode?: boolean; onNext: () => void; onEndTurn: () => void; onSelectPhase: (phase: Phase) => void; onToggleTimer: () => void; onLp: (player: PlayerId, amount: number) => void; onMove: (player: PlayerId, from: Zone, to: Zone, id: number) => void; onAddEvent: (player: EventPlayer, content: string) => void; onOpenLookup: () => void; onRematch: () => void; onNewDuel: () => void }) {
  const [player, setPlayer] = useState<PlayerId>('p1')
  const [zone, setZone] = useState<Zone>('deck')
  const [card, setCard] = useState<Card | null>(null)
  const [ending, setEnding] = useState<Ending | null>(null)
  const [summary, setSummary] = useState<Ending | null>(null)
  const [manualWinner, setManualWinner] = useState<PlayerId>('p1')
  const [manualReason, setManualReason] = useState('Concession')
  const [showManual, setShowManual] = useState(false)
  const [zeroPrompted, setZeroPrompted] = useState<PlayerId | null>(null)
  const [showSummaryJournal, setShowSummaryJournal] = useState(false)
  const active = duel.players[player]
  const playerZones = active.zones
  const defeated = useMemo(() => (duel.players.p1.lp <= 0 ? 'p1' : duel.players.p2.lp <= 0 ? 'p2' : null), [duel.players])
  const gap = duel.players.p1.lp - duel.players.p2.lp
  useEffect(() => { if (!defeated) { setZeroPrompted(null); return } if (zeroPrompted !== defeated) { setZeroPrompted(defeated); setEnding({ winner: defeated === 'p1' ? 'p2' : 'p1', reason: 'LP à 0' }) } }, [defeated, zeroPrompted])

  const common = <><PhaseBar turn={duel.turn} player={duel.activePlayer} phase={duel.phase} turnStartedAt={duel.turnStartedAt} timerEnabled={duel.timerEnabled} onNext={onNext} onEndTurn={onEndTurn} onSelectPhase={onSelectPhase} onToggleTimer={onToggleTimer} /><div className="lp-gap">{gap === 0 ? 'Égalité parfaite' : `${gap > 0 ? 'Joueur 1' : 'Joueur 2'} mène de ${Math.abs(gap)} LP`}</div><LpPanel p1={duel.players.p1.lp} p2={duel.players.p2.lp} history={duel.lpHistory} onChange={onLp} /><div className="duel-quick-actions"><button onClick={onOpenLookup}><BookOpenCheck size={16} /> Vérifier une carte</button><button onClick={() => setShowManual(true)}><Flag size={16} /> Terminer le duel</button></div></>

  if (summary) return <main className="screen duel-summary"><header><span className="mode-badge">Duel terminé</span><h1>Joueur {summary.winner === 'p1' ? '1' : '2'} gagne</h1><p>{summary.reason}</p></header><section className="summary-grid"><div><span>Durée</span><strong>{formatDuration(Date.now() - duel.startedAt)}</strong></div><div><span>Tours joués</span><strong>{duel.turn}</strong></div><div><span>LP Joueur 1</span><strong>{duel.players.p1.lp}</strong></div><div><span>LP Joueur 2</span><strong>{duel.players.p2.lp}</strong></div></section><button className="secondary summary-journal" onClick={() => setShowSummaryJournal(current => !current)}><Settings2 size={16} /> {showSummaryJournal ? 'Masquer le journal' : 'Consulter le journal complet'}</button>{showSummaryJournal && <DuelJournal events={duel.events} onAdd={onAddEvent} />}<button className="primary" onClick={onRematch}><RotateCcw size={18} /> Revanche</button><button className="secondary summary-new" onClick={onNewDuel}>Nouveau duel</button></main>

  return <main className={`screen duel-screen ${scoreMode ? 'score-duel' : ''}`}>{scoreMode && <div className="mode-badge">Mode score</div>}{common}{!scoreMode && playerZones && <><div className="player-switch"><button className={player === 'p1' ? 'active' : ''} onClick={() => setPlayer('p1')}>Joueur 1</button><button className={player === 'p2' ? 'active' : ''} onClick={() => setPlayer('p2')}>Joueur 2</button></div><ZoneTabs zones={playerZones} selected={zone} onChange={setZone} /><section className="zone-content"><div className="section-title"><h2>{zone === 'hand' ? 'Main' : zone === 'field' ? 'Terrain' : zone === 'graveyard' ? 'Cimetière' : zone === 'banished' ? 'Banni' : zone[0].toUpperCase() + zone.slice(1)}</h2><span>{playerZones[zone].length} cartes</span></div>{playerZones[zone].length ? playerZones[zone].map((item, index) => <CardRow key={`${item.id}-${index}`} card={item} onClick={() => setCard(item)} />) : <p className="empty">Zone vide.</p>}</section>{card && <CardDetail card={card} zone={zone} onClose={() => setCard(null)} onMove={to => { onMove(player, zone, to, card.id); setCard(null) }} />}</>}<DuelJournal events={duel.events} onAdd={onAddEvent} />{ending && <Modal title="Fin du duel" onClose={() => setEnding(null)}><p className="end-confirm">Joueur {ending.winner === 'p1' ? '1' : '2'} gagne — {ending.reason}. Confirmer la fin du duel ?</p><button className="primary" onClick={() => { setSummary(ending); setEnding(null) }}>Confirmer la fin</button><button className="secondary modal-cancel" onClick={() => setEnding(null)}>Continuer le duel</button></Modal>}{showManual && <Modal title="Terminer le duel" onClose={() => setShowManual(false)}><div className="manual-end"><label>Vainqueur<select value={manualWinner} onChange={event => setManualWinner(event.target.value as PlayerId)}><option value="p1">Joueur 1</option><option value="p2">Joueur 2</option></select></label><label>Raison<input value={manualReason} onChange={event => setManualReason(event.target.value)} placeholder="Concession, deck out, effet…" /></label><button className="primary" onClick={() => { setSummary({ winner: manualWinner, reason: manualReason.trim() || 'Victoire déclarée' }); setShowManual(false) }}>Terminer le duel</button></div></Modal>}</main>
}
