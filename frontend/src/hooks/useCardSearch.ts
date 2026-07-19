import { useEffect, useState } from 'react'
import type { Card } from '../types'

const ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const CARD_LANGUAGE = 'fr'

async function requestCards(query: string, exact: boolean, language?: string): Promise<Card[]> {
  const params = new URLSearchParams({ [exact ? 'name' : 'fname']: query })
  if (language) params.set('language', language)
  try {
    const response = await fetch(`${ENDPOINT}?${params.toString()}`)
    if (!response.ok) return []
    const data = await response.json() as { data?: Card[] }
    return data.data ?? []
  } catch {
    return []
  }
}

export async function findCards(query: string, exact = false): Promise<Card[]> {
  const value = query.trim()
  if (!value) return []
  const frenchCards = await requestCards(value, exact, CARD_LANGUAGE)
  // Recent cards can miss a French translation; use the default API data
  // instead of blocking the manual search or the post-scan resolution.
  return frenchCards.length ? frenchCards : requestCards(value, exact)
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
