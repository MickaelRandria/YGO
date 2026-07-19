import { useEffect, useState } from 'react'
import type { Card } from '../types'

const ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
export async function findCards(query: string, exact = false): Promise<Card[]> {
  const value = query.trim()
  if (!value) return []
  const url = `${ENDPOINT}?${exact ? 'name' : 'fname'}=${encodeURIComponent(value)}`
  const response = await fetch(url)
  if (!response.ok) return []
  const data = await response.json() as { data?: Card[] }
  return data.data ?? []
}
export function useCardSearch(query: string) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const term = query.trim()
    if (!term) { setCards([]); return }
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try { setCards(await findCards(term)) } finally { setLoading(false) }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [query])
  return { cards, loading }
}
