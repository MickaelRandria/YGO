import { useState } from 'react'
import type { Card } from '../types'
import { findCards } from './useCardSearch'

const scanApiUrl = import.meta.env.VITE_SCAN_API_URL ?? 'http://localhost:5000/api/scan'

export interface ScanResult {
  name: string
  confidence: number
  uncertain: boolean
  card?: Card
}

export function useCardScan() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [results, setResults] = useState<ScanResult[]>([])

  const scan = async (file: File) => {
    setError('')
    setResults([])
    setStatus('Envoi de la photo au scanner local...')
    try {
      const payload = new FormData()
      payload.append('image', file)
      const response = await fetch(scanApiUrl, { method: 'POST', body: payload })
      const data = await response.json() as { cards?: Array<{ name: string; confidence: number; uncertain?: boolean }>; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Le scan local a échoué.')
      const detected = data.cards ?? []
      if (!detected.length) { setStatus('Aucune carte identifiée. Réessayez avec une photo plus nette.'); return }
      setStatus(`Résolution de ${detected.length} carte${detected.length > 1 ? 's' : ''}...`)
      const resolved = await Promise.all(detected.map(async result => {
        const matches = await findCards(result.name, true)
        return { ...result, uncertain: result.uncertain ?? result.confidence < 70, card: matches[0] } satisfies ScanResult
      }))
      setResults(resolved)
      const reliable = resolved.filter(result => !result.uncertain && result.card).length
      const uncertain = resolved.filter(result => result.uncertain).length
      setStatus(`${reliable} résultat${reliable > 1 ? 's' : ''} fiable${reliable > 1 ? 's' : ''}${uncertain ? ` · ${uncertain} à confirmer` : ''}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de scan.')
      setStatus('')
    }
  }
  return { scan, results, status, error, clear: () => { setResults([]); setStatus(''); setError('') } }
}
