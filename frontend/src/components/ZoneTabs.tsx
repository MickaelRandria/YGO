import { Ban, Hand, Package, Skull, Star, Swords } from 'lucide-react'
import type { PlayerZones, Zone } from '../types'

const labels: Array<{ zone: Zone; label: string; Icon: typeof Package }> = [
  { zone: 'deck', label: 'Deck', Icon: Package },
  { zone: 'hand', label: 'Main', Icon: Hand },
  { zone: 'field', label: 'Terrain', Icon: Swords },
  { zone: 'graveyard', label: 'Cimetière', Icon: Skull },
  { zone: 'banished', label: 'Banni', Icon: Ban },
  { zone: 'extra', label: 'Extra', Icon: Star },
]

export function ZoneTabs({ zones, selected, onChange }: { zones: PlayerZones; selected: Zone; onChange: (zone: Zone) => void }) {
  return <div className="zone-tabs">{labels.map(({ zone, label, Icon }) => <button key={zone} className={zone === selected ? 'active' : ''} onClick={() => onChange(zone)}><Icon size={17} aria-hidden="true" />{label}<b>{zones[zone].length}</b></button>)}</div>
}
