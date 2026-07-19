import { useState } from 'react'
import { ArrowLeft, Camera, Search, Trash2 } from 'lucide-react'
import type { Card, Deck } from '../types'
import { useCardSearch } from '../hooks/useCardSearch'
import { CardRow } from '../components/CardRow'
import { Scanner } from '../components/Scanner'

export function DeckBuilder({ deck, player, onSave, onBack }: { deck: Deck; player: string; onSave: (cards: Card[]) => void; onBack: () => void }) {
  const [cards, setCards] = useState<Card[]>(deck.cards)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'scan' | 'search'>('scan')
  const { cards: results, loading } = useCardSearch(query)
  const add = (incoming: Card[]) => setCards(current => [...current, ...incoming])
  const remove = (id: number) => setCards(current => { const index = current.findIndex(card => card.id === id); return index < 0 ? current : current.filter((_, i) => i !== index) })
  const main = cards.filter(card => !/Fusion|Synchro|Xyz|Link/.test(card.type)).length
  const extra = cards.length - main
  const openCorrection = (name: string) => { setQuery(name); setMode('search') }

  return <main className="screen deck-builder">
    <header className="sub-header"><button className="icon-button" onClick={() => { onSave(cards); onBack() }}><ArrowLeft /></button><div><h1>Deck de {player}</h1><p>{cards.length} cartes chargées</p></div><button className="icon-button danger-icon" onClick={() => setCards([])} title="Vider le deck"><Trash2 /></button></header>
    <div className="mode-switch"><button className={mode === 'scan' ? 'active' : ''} onClick={() => setMode('scan')}><Camera size={16} />Scanner</button><button className={mode === 'search' ? 'active' : ''} onClick={() => setMode('search')}><Search size={16} />Recherche</button></div>
    {mode === 'scan' ? <Scanner onAdd={add} onCorrect={openCorrection} /> : <section><label className="search-box"><Search size={18} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom de carte…" /></label>{loading && <p className="status">Recherche…</p>}<div className="result-list">{results.map(card => <CardRow key={card.id} card={card} action="add" onAction={() => add([card])} />)}</div></section>}
    <section className="current-deck"><div className="section-title"><h2>Deck en cours</h2><span>{main} main · {extra} extra</span></div>{cards.length ? cards.map((card, i) => <CardRow key={`${card.id}-${i}`} card={card} action="remove" onAction={() => remove(card.id)} />) : <p className="empty">Aucune carte — scannez ou recherchez une carte.</p>}</section>
    <button className="primary floating-save" onClick={() => { onSave(cards); onBack() }}>Enregistrer le deck</button>
  </main>
}
