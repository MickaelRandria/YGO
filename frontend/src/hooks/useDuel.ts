import { useState } from 'react'
import type { Card, DuelState, Phase, PlayerId, Zone } from '../types'

const zones = (): Record<Zone, Card[]> => ({ deck: [], hand: [], field: [], graveyard: [], banished: [], extra: [] })
const phases: Phase[] = ['Draw', 'Standby', 'Main 1', 'Battle', 'Main 2', 'End']
const initial = (): DuelState => ({ players: { p1: { lp: 8000, zones: zones() }, p2: { lp: 8000, zones: zones() } }, turn: 1, activePlayer: 'p1', phase: 'Draw', lpHistory: [] })
const extra = (card: Card) => /Fusion|Synchro|Xyz|Link/.test(card.type)

export function useDuel() {
  const [duel, setDuel] = useState<DuelState>(initial)
  const loadDecks = (p1: Card[], p2: Card[]) => setDuel(current => ({ ...initial(), players: { p1: { lp: 8000, zones: { ...zones(), deck: p1.filter(c => !extra(c)), extra: p1.filter(extra) } }, p2: { lp: 8000, zones: { ...zones(), deck: p2.filter(c => !extra(c)), extra: p2.filter(extra) } } } }))
  const changeLp = (player: PlayerId, difference: number) => setDuel(current => { const value = Math.max(0, current.players[player].lp + difference); return { ...current, players: { ...current.players, [player]: { ...current.players[player], lp: value } }, lpHistory: [{ player, difference, value, at: Date.now() }, ...current.lpHistory] } })
  const nextPhase = () => setDuel(current => { const idx = phases.indexOf(current.phase); if (idx < phases.length - 1) return { ...current, phase: phases[idx + 1] }; return { ...current, phase: 'Draw', turn: current.turn + 1, activePlayer: current.activePlayer === 'p1' ? 'p2' : 'p1' } })
  const moveCard = (player: PlayerId, from: Zone, to: Zone, cardId: number) => setDuel(current => { const card = current.players[player].zones[from].find(c => c.id === cardId); if (!card || from === to) return current; return { ...current, players: { ...current.players, [player]: { ...current.players[player], zones: { ...current.players[player].zones, [from]: current.players[player].zones[from].filter(c => c.id !== cardId), [to]: [...current.players[player].zones[to], card] } } } } })
  return { duel, loadDecks, changeLp, nextPhase, moveCard }
}
