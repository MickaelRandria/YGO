export type Zone = 'deck' | 'hand' | 'field' | 'graveyard' | 'banished' | 'extra'
export type Phase = 'Draw' | 'Standby' | 'Main 1' | 'Battle' | 'Main 2' | 'End'
export type PlayerId = 'p1' | 'p2'

export interface Card {
  id: number
  name: string
  type: string
  desc: string
  race?: string
  attribute?: string
  level?: number
  atk?: number
  def?: number
  archetype?: string
  card_images?: Array<{ image_url_small: string; image_url: string }>
  banlist_info?: { ban_tcg?: string; ban_ocg?: string }
}

export interface Deck { name: string; cards: Card[] }
export type PlayerZones = Record<Zone, Card[]>
export interface PlayerState { lp: number; zones: PlayerZones }
export interface LpLog { player: PlayerId; difference: number; value: number; at: number }
export interface DuelState { players: Record<PlayerId, PlayerState>; turn: number; activePlayer: PlayerId; phase: Phase; lpHistory: LpLog[] }
