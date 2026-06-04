import { createContext, useContext } from 'react'

/**
 * Map of cardId → Y-translate pixels for focus-mode lineage alignment.
 * Cards not in the map get no transform. The Board is responsible for
 * populating this via `useLineageAlignment` and wrapping its children
 * in the provider.
 */
export const LineageAlignmentContext = createContext<Map<string, number>>(
  new Map(),
)

export function useLineageOffset(cardId: string): number {
  const map = useContext(LineageAlignmentContext)
  return map.get(cardId) ?? 0
}
