import { Play, Pencil, Zap } from 'lucide-react'
import type { Deck } from '../types'
import type { DuelMode } from '../App'
import { DuelScape } from '../components/DuelScape'

export function SetupScreen({ decks, duelMode, onModeChange, onEdit, onStart, onStartScore }: { decks: Record<'p1' | 'p2', Deck>; duelMode: DuelMode; onModeChange: (mode: DuelMode) => void; onEdit: (player: 'p1' | 'p2') => void; onStart: () => void; onStartScore: () => void }) {
  const canStart = decks.p1.cards.length > 0 && decks.p2.cards.length > 0
  return <main className="screen">
    <header className="brand"><div className="brand-mark">YR</div><div><h1>YGO Referee</h1><p>Configuration du duel</p></div></header>
    <section className="mode-choice" aria-label="Mode de jeu">
      <h2>Comment veux-tu jouer ?</h2>
      <div className="mode-choice-grid">
        <button className={duelMode === 'complet' ? 'selected' : ''} onClick={() => onModeChange('complet')}><strong>Mode complet</strong><span>Deck construit, suivi des zones : Main, Terrain, Cimetière…</span></button>
        <button className={duelMode === 'score' ? 'selected score' : 'score'} onClick={onStartScore}><strong><Zap size={16} /> Mode score simple</strong><span>Juste les LP, le tour et la phase. Lancement immédiat.</span></button>
      </div>
    </section>
    <div className="setup-cards">{(['p1', 'p2'] as const).map((player, index) => { const deck = decks[player]; return <section className="setup-card" key={player}><DuelScape player={player} lp={8000} decorative /><div className="setup-head"><div><span>Joueur {index + 1}</span><strong>{deck.cards.length} carte{deck.cards.length !== 1 ? 's' : ''}</strong></div><button className="secondary" onClick={() => onEdit(player)}><Pencil size={16} />{deck.cards.length ? 'Modifier' : 'Construire'}</button></div><div className="card-preview">{deck.cards.slice(0, 5).map((card, i) => card.card_images?.[0] ? <img key={`${card.id}-${i}`} src={card.card_images[0].image_url_small} alt="" /> : <div key={i} />)}{!deck.cards.length && <p>Le deck sera conservé localement.</p>}</div></section> })}</div>
    <button className="primary launch" disabled={!canStart} onClick={onStart}><Play size={20} /> Lancer le duel complet</button>
    {!canStart && <p className="hint">Ajoutez au moins une carte à chaque deck, ou choisissez le mode score simple.</p>}
  </main>
}
