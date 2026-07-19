import { Camera, RotateCcw } from 'lucide-react'
import { useCardScan } from '../hooks/useCardScan'
import { CardRow } from './CardRow'
import type { Card } from '../types'

export function Scanner({ onAdd, onCorrect }: { onAdd: (cards: Card[]) => void; onCorrect: (name: string) => void }) {
  const { scan, results, status, error, clear } = useCardScan()
  const reliable = results.filter(result => !result.uncertain && result.card)
  const uncertain = results.filter(result => result.uncertain)
  return <section className="scanner">
    <label className="scan-button"><Camera size={20} /> Photographier les cartes<input type="file" accept="image/*" capture="environment" onChange={e => { const file = e.target.files?.[0]; if (file) scan(file) }} /></label>
    {status && <p className="status">{status}</p>}
    {error && <p className="error">{error}</p>}
    {reliable.length > 0 && <div className="scan-results">
      <button className="primary" onClick={() => { onAdd(reliable.flatMap(result => result.card ? [result.card] : [])); clear() }}>Ajouter toutes les {reliable.length} cartes fiables</button>
      {reliable.map((result, i) => result.card && <CardRow key={`${result.card.id}-${i}`} card={result.card} action="add" onAction={() => onAdd([result.card!])} />)}
    </div>}
    {uncertain.length > 0 && <div className="uncertain-results"><h3>À confirmer</h3><p>Ces suggestions ne sont jamais ajoutées automatiquement.</p>
      {uncertain.map((result, i) => <article className="uncertain-card" key={`${result.name}-${i}`}><div><strong>{result.name}</strong><span>Confiance : {result.confidence}%</span></div><div><button className="secondary" onClick={() => result.card ? onAdd([result.card]) : onCorrect(result.name)}>Confirmer ce nom</button><button className="secondary" onClick={() => onCorrect(result.name)}>Corriger</button></div></article>)}
    </div>}
    {(error || status.includes('Aucune')) && <button className="secondary retry" onClick={clear}><RotateCcw size={16} /> Réessayer</button>}
  </section>
}
