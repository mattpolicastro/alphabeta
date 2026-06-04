import type { Connection } from '@/lib/strategy/types'

/**
 * Returns the set of ancestor card IDs for a given card, walking the
 * connection graph backward (connections where this card is the `to` end).
 * The returned set does NOT include the card itself.
 */
export function getAncestors(
  cardId: string,
  connections: Connection[],
): Set<string> {
  const incoming = new Map<string, string[]>()
  for (const c of connections) {
    const list = incoming.get(c.toCardId)
    if (list) list.push(c.fromCardId)
    else incoming.set(c.toCardId, [c.fromCardId])
  }
  return walk(cardId, incoming)
}

/**
 * Returns the set of descendant card IDs, walking forward (connections
 * where this card is the `from` end). Does NOT include the card itself.
 */
export function getDescendants(
  cardId: string,
  connections: Connection[],
): Set<string> {
  const outgoing = new Map<string, string[]>()
  for (const c of connections) {
    const list = outgoing.get(c.fromCardId)
    if (list) list.push(c.toCardId)
    else outgoing.set(c.fromCardId, [c.toCardId])
  }
  return walk(cardId, outgoing)
}

/**
 * The full lineage set for a focused card: the card itself plus every
 * ancestor and every descendant reachable through the connection graph.
 * Everything in this set stays at full opacity; everything else desaturates.
 *
 * Alignment (moving cards to share a Y with the focused card) uses
 * `getAncestors` only, since descendants already sit to the right in their
 * own columns and don't benefit from repositioning.
 */
export function getLineage(
  cardId: string,
  connections: Connection[],
): Set<string> {
  const set = getAncestors(cardId, connections)
  for (const d of getDescendants(cardId, connections)) set.add(d)
  set.add(cardId)
  return set
}

function walk(
  startId: string,
  adjacency: Map<string, string[]>,
): Set<string> {
  const visited = new Set<string>()
  const stack = [startId]
  while (stack.length > 0) {
    const current = stack.pop()!
    const neighbors = adjacency.get(current)
    if (!neighbors) continue
    for (const n of neighbors) {
      if (visited.has(n)) continue
      visited.add(n)
      stack.push(n)
    }
  }
  return visited
}

