import { lazy, Suspense, useState } from 'react'
import { ArrowLeft, Camera, ClipboardList, Search, Trash2 } from 'lucide-react'
import type { Card, Deck } from '../types'
import { findCards, useCardSearch } from '../hooks/useCardSearch'
import { CardRow } from '../components/CardRow'
import { DuelScape } from '../components/DuelScape'

const ENABLE_SCAN = import.meta.env.VITE_ENABLE_SCAN === 'true'
// Vite replaces VITE_ENABLE_SCAN at build time. With false, Rollup removes this
// branch: neither Scanner nor useCardScan (and therefore no API URL) is bundled.
const Scanner = ENABLE_SCAN ? lazy(() => import('../components/Scanner').then(module => ({ default: module.Scanner }))) : null

type BuilderMode = 'scan' | 'search' | 'list'
type ImportedCard = { input: string; card: Card }

export function DeckBuilder({ deck, player, onSave, onBack }: { deck: Deck; player: string; onSave: (cards: Card[]) => void; onBack: () => void }) {
  const [cards, setCards] = useState<Card[]>(deck.cards)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<BuilderMode>(ENABLE_SCAN ? 'scan' : 'search')
  const [listText, setListText] = useState('')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<ImportedCard[]>([])
  const [unresolved, setUnresolved] = useState<string[]>([])
  const { cards: results, loading } = useCardSearch(query)
  const add = (incoming: Card[]) => setCards(current => [...current, ...incoming])
  const remove = (id: number) => setCards(current => { const index = current.findIndex(card => card.id === id); return index < 0 ? current : current.filter((_, i) => i !== index) })
  const main = cards.filter(card => !/Fusion|Synchro|Xyz|Link/.test(card.type)).length
  const extra = cards.length - main
  const openCorrection = (name: string) => { setQuery(name); setMode('search') }
  const importList = async () => {
    const lines = listText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    if (!lines.length) return
    setImporting(true); setImported([]); setUnresolved([])
    const resolved = await Promise.all(lines.map(async input => {
      const exact = await findCards(input, true)
      const card = exact[0] ?? (await findCards(input))[0]
      return card ? { input, card } : { input }
    }))
    const found = resolved.filter((item): item is ImportedCard => 'card' in item)
    const missing = resolved.filter(item => !('card' in item)).map(item => item.input)
    add(found.map(item => item.card))
    setImported(found); setUnresolved(missing); setImporting(false)
  }

  return <main className="screen deck-builder">
    <header className="sub-header"><button className="icon-button" onClick={() => { onSave(cards); onBack() }}><ArrowLeft /></button><div><h1>Deck de {player}</h1><p>{cards.length} cartes chargées</p></div><button className="icon-button danger-icon" onClick={() => setCards([])} title="Vider le deck"><Trash2 /></button></header>
    <div className={`mode-switch ${ENABLE_SCAN ? '' : 'without-scan'}`}>
      {ENABLE_SCAN && <button className={mode === 'scan' ? 'active' : ''} onClick={() => setMode('scan')}><Camera size={16} />Scanner</button>}
      <button className={mode === 'search' ? 'active' : ''} onClick={() => setMode('search')}><Search size={16} />Recherche</button>
      <button className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}><ClipboardList size={16} />Coller une liste</button>
    </div>
    {mode === 'scan' && Scanner && <section className="deck-feature deck-feature-scan"><DuelScape player="p1" lp={8000} decorative /><Suspense fallback={<p className="status">Chargement du scanner…</p>}><Scanner onAdd={add} onCorrect={openCorrection} /></Suspense></section>}
    {mode === 'search' && <section className="deck-feature deck-feature-search"><DuelScape player="p2" lp={8000} decorative /><label className="search-box"><Search size={18} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom de carte…" /></label>{loading && <p className="status">Recherche…</p>}<div className="result-list">{results.map(card => <CardRow key={card.id} card={card} action="add" onAction={() => add([card])} />)}</div></section>}
    {mode === 'list' && <section className="list-import"><label htmlFor="deck-list">Un nom de carte par ligne</label><textarea id="deck-list" value={listText} onChange={event => setListText(event.target.value)} placeholder={'Dragon Blanc aux Yeux Bleus\nMagicien Sombre\nTrou Noir'} /><button className="primary" disabled={importing || !listText.trim()} onClick={importList}>{importing ? 'Import en cours…' : 'Importer la liste'}</button>{imported.length > 0 && <div className="import-results"><h2>{imported.length} carte{imported.length > 1 ? 's' : ''} ajoutée{imported.length > 1 ? 's' : ''}</h2>{imported.map((item, index) => <CardRow key={`${item.card.id}-${index}`} card={item.card} />)}</div>}{unresolved.length > 0 && <div className="unresolved-results"><h3>{unresolved.length} nom{unresolved.length > 1 ? 's' : ''} non trouvé{unresolved.length > 1 ? 's' : ''}</h3>{unresolved.map((name, index) => <button key={`${name}-${index}`} className="secondary" onClick={() => openCorrection(name)}>{name} <Search size={14} /> Corriger</button>)}</div>}</section>}
    <section className="current-deck"><div className="section-title"><h2>Deck en cours</h2><span>{main} main · {extra} extra</span></div>{cards.length ? cards.map((card, i) => <CardRow key={`${card.id}-${i}`} card={card} action="remove" onAction={() => remove(card.id)} />) : <p className="empty">Aucune carte — recherchez, collez une liste{ENABLE_SCAN ? ' ou scannez une carte' : ''}.</p>}</section>
    <button className="primary floating-save" onClick={() => { onSave(cards); onBack() }}>Enregistrer le deck</button>
  </main>
}
