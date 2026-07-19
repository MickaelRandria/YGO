import { useState } from 'react'
import type { Card, DuelEvent, DuelState, EventPlayer, Phase, PlayerId, Zone } from '../types'

const zones = (): Record<Zone, Card[]> => ({ deck: [], hand: [], field: [], graveyard: [], banished: [], extra: [] })
const phases: Phase[] = ['Draw', 'Standby', 'Main 1', 'Battle', 'Main 2', 'End']
const initial = (): DuelState => { const now = Date.now(); return { players: { p1: { lp: 8000 }, p2: { lp: 8000 } }, turn: 1, activePlayer: 'p1', phase: 'Draw', lpHistory: [], events: [], startedAt: now, turnStartedAt: now, timerEnabled: false } }
const extra = (card: Card) => /Fusion|Synchro|Xyz|Link/.test(card.type)
const eventId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export function useDuel() {
  const [duel, setDuel] = useState<DuelState>(initial)
  const loadDecks = (p1: Card[], p2: Card[]) => setDuel({ ...initial(), players: { p1: { lp: 8000, zones: { ...zones(), deck: p1.filter(card => !extra(card)), extra: p1.filter(extra) } }, p2: { lp: 8000, zones: { ...zones(), deck: p2.filter(card => !extra(card)), extra: p2.filter(extra) } } } })
  const startScore = () => setDuel(initial())
  const changeLp = (player: PlayerId, difference: number) => setDuel(current => {
    const value = Math.max(0, current.players[player].lp + difference)
    const log = { player, difference, value, at: Date.now() }
    const event: DuelEvent = { id: eventId(), kind: 'lp', player, content: `${difference > 0 ? '+' : ''}${difference} LP → ${value}`, at: log.at, turn: current.turn, phase: current.phase }
    return { ...current, players: { ...current.players, [player]: { ...current.players[player], lp: value } }, lpHistory: [log, ...current.lpHistory], events: [event, ...current.events] }
  })
  const addEvent = (player: EventPlayer, content: string) => setDuel(current => {
    const clean = content.trim()
    if (!clean) return current
    const event: DuelEvent = { id: eventId(), kind: 'note', player, content: clean, at: Date.now(), turn: current.turn, phase: current.phase }
    return { ...current, events: [event, ...current.events] }
  })
  const endTurn = () => setDuel(current => ({ ...current, phase: 'Draw', turn: current.turn + 1, activePlayer: current.activePlayer === 'p1' ? 'p2' : 'p1', turnStartedAt: Date.now() }))
  const nextPhase = () => setDuel(current => { const index = phases.indexOf(current.phase); if (index < phases.length - 1) return { ...current, phase: phases[index + 1] }; return { ...current, phase: 'Draw', turn: current.turn + 1, activePlayer: current.activePlayer === 'p1' ? 'p2' : 'p1', turnStartedAt: Date.now() } })
  const selectPhase = (phase: Phase) => setDuel(current => ({ ...current, phase }))
  const toggleTimer = () => setDuel(current => ({ ...current, timerEnabled: !current.timerEnabled, turnStartedAt: Date.now() }))
  const moveCard = (player: PlayerId, from: Zone, to: Zone, cardId: number) => setDuel(current => { const playerZones = current.players[player].zones; if (!playerZones) return current; const card = playerZones[from].find(item => item.id === cardId); if (!card || from === to) return current; return { ...current, players: { ...current.players, [player]: { ...current.players[player], zones: { ...playerZones, [from]: playerZones[from].filter(item => item.id !== cardId), [to]: [...playerZones[to], card] } } } } })
  return { duel, loadDecks, startScore, changeLp, addEvent, endTurn, nextPhase, selectPhase, toggleTimer, moveCard }
}
