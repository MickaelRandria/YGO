import { BookOpen, Search, Settings, Swords } from 'lucide-react'
export type Screen = 'duel' | 'lookup' | 'rules' | 'setup'
const items: Array<{ id: Screen; label: string; Icon: typeof Swords }> = [{ id: 'duel', label: 'Duel', Icon: Swords }, { id: 'lookup', label: 'Lookup', Icon: Search }, { id: 'rules', label: 'Règles', Icon: BookOpen }, { id: 'setup', label: 'Setup', Icon: Settings }]
export function BottomNav({ current, onChange }: { current: Screen; onChange: (screen: Screen) => void }) { return <nav className="bottom-nav">{items.map(({ id, label, Icon }) => <button key={id} className={current === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={20} /><span>{label}</span></button>)}</nav> }
