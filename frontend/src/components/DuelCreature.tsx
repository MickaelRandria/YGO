type CreatureState = 'dominant' | 'stable' | 'critical' | 'eliminated'

export function DuelCreature({ state }: { state: CreatureState }) {
  const path = state === 'dominant'
    ? 'M32 5 41 20l15-6-7 17 11 12-18 1-10 15-10-15-18-1 11-12-7-17 15 6Z'
    : state === 'stable'
      ? 'M32 10 41 24l14-5-8 15 9 11-15 2-9 12-9-12-15-2 9-11-8-15 14 5Z'
      : state === 'critical'
        ? 'M17 18 33 16l14 9-5 12 8 9-16 7-16-7 8-10-9-9Zm15 7-6 10 6 8 7-8Z'
        : 'm10 40 15-12 11 6 10-7 8 13-11 8 4 9-16-2-13 4 5-11Z'

  return <svg className={`duel-creature creature-${state}`} viewBox="0 0 64 64" aria-hidden="true"><path d={path} fill="currentColor" /></svg>
}
