import type { PlayerId } from '../types'

const compactAmount = (amount: number) => {
  const absolute = Math.abs(amount)
  return `${amount > 0 ? '+' : '-'}${absolute >= 1000 ? `${absolute / 1000}K` : absolute}`
}

export function LpActionButton({ amount, player, onPress }: { amount: number; player: PlayerId; onPress: (amount: number) => void }) {
  const action = amount > 0 ? 'Ajouter' : 'Retirer'
  const playerLabel = player === 'p1' ? '1' : '2'

  return <button className={`score-lp-action ${amount > 0 ? 'gain' : 'loss'}`} onClick={() => onPress(amount)} aria-label={`${action} ${Math.abs(amount)} LP au joueur ${playerLabel}`}>
    {compactAmount(amount)}
  </button>
}
