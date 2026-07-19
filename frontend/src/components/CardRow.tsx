import { Minus, Plus } from 'lucide-react'
import type { Card } from '../types'
export function CardRow({ card, action, onAction, onClick }: { card: Card; action?: 'add' | 'remove'; onAction?: () => void; onClick?: () => void }) {
  const image = card.card_images?.[0]?.image_url_small
  return <article className="card-row" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={e => { if (onClick && e.key === 'Enter') onClick() }}>
    {image ? <img src={image} alt="" loading="lazy" /> : <div className="card-placeholder" />}
    <div className="card-copy"><strong>{card.name}</strong><span className={`type type-${card.type.includes('Spell') ? 'spell' : card.type.includes('Trap') ? 'trap' : 'monster'}`}>{card.type}</span><small>{card.atk !== undefined ? `ATK ${card.atk} / DEF ${card.def ?? '—'}` : card.race ?? ''}</small></div>
    {action && <button className="round-action" onClick={e => { e.stopPropagation(); onAction?.() }} aria-label={action === 'add' ? `Ajouter ${card.name}` : `Retirer ${card.name}`}>{action === 'add' ? <Plus size={18} /> : <Minus size={18} />}</button>}
  </article>
}
