import { useState } from 'react'
import { Search } from 'lucide-react'
import { useCardSearch } from '../hooks/useCardSearch'
import { CardRow } from '../components/CardRow'
import { CardDetail } from '../components/CardDetail'
import type { Card } from '../types'
export function LookupScreen() { const [query, setQuery] = useState(''); const [selected, setSelected] = useState<Card | null>(null); const { cards, loading } = useCardSearch(query); return <main className="screen"><header className="page-header"><h1>Lookup</h1><p>Rechercher toute carte Yu-Gi-Oh!</p></header><label className="search-box"><Search size={18} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex. Inspector Boarder" /></label>{loading && <p className="status">Recherche dans YGOPRODeck…</p>}<section className="result-list">{cards.map(card => <CardRow key={card.id} card={card} onClick={() => setSelected(card)} />)}</section>{query && !loading && !cards.length && <p className="empty">Aucune carte trouvée.</p>}{selected && <CardDetail card={selected} onClose={() => setSelected(null)} />}</main> }
