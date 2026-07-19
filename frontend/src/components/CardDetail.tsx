import type { Card, Zone } from '../types'
import { Modal } from './Modal'
const zoneNames: Record<Zone, string> = { deck: 'Deck', hand: 'Main', field: 'Terrain', graveyard: 'Cimetière', banished: 'Banni', extra: 'Extra' }
export function CardDetail({ card, zone, onClose, onMove }: { card: Card; zone?: Zone; onClose: () => void; onMove?: (to: Zone) => void }) {
  const image = card.card_images?.[0]?.image_url
  return <Modal title={card.name} onClose={onClose}><div className="card-detail">{image && <img src={image} alt={card.name} />}<div className="details-grid"><span>Type</span><b>{card.type}</b>{card.race && <><span>Race</span><b>{card.race}</b></>}{card.attribute && <><span>Attribut</span><b>{card.attribute}</b></>}{card.level && <><span>Niveau</span><b>{card.level}</b></>}{card.atk !== undefined && <><span>ATK / DEF</span><b>{card.atk} / {card.def ?? '—'}</b></>}</div>{card.banlist_info?.ban_tcg && <p className="banlist">TCG : {card.banlist_info.ban_tcg}</p>}<p className="effect-text">{card.desc}</p>{onMove && <div><h3>Déplacer vers</h3><div className="move-grid">{(Object.keys(zoneNames) as Zone[]).filter(key => key !== zone).map(key => <button key={key} onClick={() => onMove(key)}>{zoneNames[key]}</button>)}</div></div>}</div></Modal>
}
