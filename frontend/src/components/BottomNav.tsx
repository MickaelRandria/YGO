import { useEffect, useRef, useState } from 'react'
import { BookOpen, Search, Settings, Swords } from 'lucide-react'
export type Screen = 'duel' | 'lookup' | 'rules' | 'setup'
const items: Array<{ id: Screen; label: string; Icon: typeof Swords }> = [{ id: 'duel', label: 'Duel', Icon: Swords }, { id: 'lookup', label: 'Lookup', Icon: Search }, { id: 'rules', label: 'Règles', Icon: BookOpen }, { id: 'setup', label: 'Setup', Icon: Settings }]
export function BottomNav({ current, onChange }: { current: Screen; onChange: (screen: Screen) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const previousScroll = useRef(0)
  const settleTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const onScroll = () => {
      const currentScroll = window.scrollY
      if (currentScroll > previousScroll.current + 12) setCollapsed(true)
      if (currentScroll < previousScroll.current) setCollapsed(false)
      previousScroll.current = currentScroll
      if (settleTimer.current) window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(() => setCollapsed(false), 360)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (settleTimer.current) window.clearTimeout(settleTimer.current) }
  }, [])
  return <nav className={`bottom-nav ${collapsed ? 'is-collapsed' : ''}`} aria-label="Navigation principale">
    {items.map(({ id, label, Icon }) => <button key={id} className={current === id ? 'active' : ''} onClick={() => onChange(id)} aria-current={current === id ? 'page' : undefined}>
      <Icon size={20} />
      <span>{label}</span>
    </button>)}
  </nav>
}
