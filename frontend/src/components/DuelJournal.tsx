import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { DuelEvent, EventPlayer, PlayerId } from '../types'

const label = (player: EventPlayer) => player === 'p1' ? 'J1' : player === 'p2' ? 'J2' : 'Global'

export function DuelJournal({ events, onAdd }: { events: DuelEvent[]; onAdd: (player: EventPlayer, content: string) => void }) {
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [player, setPlayer] = useState<EventPlayer>('global')
  const [content, setContent] = useState('')
  const [filter, setFilter] = useState<'all' | EventPlayer>('all')
  const [turnFilter, setTurnFilter] = useState('')
  const visible = useMemo(() => events.filter(event => (filter === 'all' || event.player === filter) && (!turnFilter || event.turn === Number(turnFilter))), [events, filter, turnFilter])
  const submit = () => { onAdd(player, content); setContent(''); setAdding(false) }
  return <section className="duel-journal"><header><button className="journal-title" onClick={() => setOpen(current => !current)}>Journal du duel <span>{events.length}</span></button><button className="journal-add" onClick={() => setAdding(current => !current)}><Plus size={16} /> Événement</button></header>{adding && <form className="event-form" onSubmit={event => { event.preventDefault(); submit() }}><select value={player} onChange={event => setPlayer(event.target.value as EventPlayer)}><option value="global">Global</option><option value="p1">Joueur 1</option><option value="p2">Joueur 2</option></select><input autoFocus value={content} onChange={event => setContent(event.target.value)} placeholder="Ex. Active Trou Noir" /><button className="primary" disabled={!content.trim()}>Ajouter</button></form>}{open && <><div className="journal-filters"><select value={filter} onChange={event => setFilter(event.target.value as 'all' | EventPlayer)}><option value="all">Tous les joueurs</option><option value="p1">Joueur 1</option><option value="p2">Joueur 2</option><option value="global">Global</option></select><input inputMode="numeric" value={turnFilter} onChange={event => setTurnFilter(event.target.value.replace(/\D/g, ''))} placeholder="Tour" /></div><div className="journal-list">{visible.length ? visible.map(event => <article className={`journal-entry ${event.kind}`} key={event.id}><span className={`event-player ${event.player}`}>{label(event.player)}</span><div><small>T{event.turn} · {event.phase} · {new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><strong>{event.content}</strong></div></article>) : <p className="empty">Aucun événement pour ce filtre.</p>}</div></>}</section>
}
