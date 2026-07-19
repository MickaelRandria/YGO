import { useEffect, useState } from 'react'
import type { Card, Deck } from './types'
import { useDuel } from './hooks/useDuel'
import { BottomNav, type Screen } from './components/BottomNav'
import { SetupScreen } from './screens/SetupScreen'
import { DeckBuilder } from './screens/DeckBuilder'
import { DuelScreen } from './screens/DuelScreen'
import { LookupScreen } from './screens/LookupScreen'
import { RulesScreen } from './screens/RulesScreen'

const emptyDeck = (name: string): Deck => ({ name, cards: [] })
export type DuelMode = 'complet' | 'score'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [editing, setEditing] = useState<'p1' | 'p2' | null>(null)
  const [duelMode, setDuelMode] = useState<DuelMode>('complet')
  const [decks, setDecks] = useState<Record<'p1' | 'p2', Deck>>(() => {
    try { return JSON.parse(localStorage.getItem('ygo-referee-decks') ?? '') }
    catch { return { p1: emptyDeck('Joueur 1'), p2: emptyDeck('Joueur 2') } }
  })
  const { duel, loadDecks, startScore: resetScoreDuel, changeLp, nextPhase, moveCard } = useDuel()

  useEffect(() => localStorage.setItem('ygo-referee-decks', JSON.stringify(decks)), [decks])
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined) }, [])

  const saveDeck = (cards: Card[]) => {
    if (!editing) return
    setDecks(current => ({ ...current, [editing]: { ...current[editing], cards } }))
    setEditing(null)
  }
  const startScore = () => {
    setDuelMode('score')
    resetScoreDuel()
    setScreen('duel')
  }
  const startComplete = () => {
    setDuelMode('complet')
    loadDecks(decks.p1.cards, decks.p2.cards)
    setScreen('duel')
  }

  if (editing) return <div className="app"><DeckBuilder deck={decks[editing]} player={editing === 'p1' ? 'Joueur 1' : 'Joueur 2'} onSave={saveDeck} onBack={() => setEditing(null)} /></div>

  return <div className="app">
    {screen === 'setup' && <SetupScreen decks={decks} duelMode={duelMode} onModeChange={setDuelMode} onEdit={setEditing} onStart={startComplete} onStartScore={startScore} />}
    {screen === 'duel' && <DuelScreen scoreMode={duelMode === 'score'} duel={duel} onNext={nextPhase} onLp={changeLp} onMove={moveCard} />}
    {screen === 'lookup' && <LookupScreen />}
    {screen === 'rules' && <RulesScreen />}
    <BottomNav current={screen} onChange={setScreen} />
  </div>
}
