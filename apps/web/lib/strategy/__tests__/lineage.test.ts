import { describe, expect, it } from 'vitest'
import { getAncestors, getDescendants, getLineage } from '../utils/lineage'
import type { Connection } from '../types'

const connections: Connection[] = [
  { id: 'c1', fromCardId: 'A', toCardId: 'B' },
  { id: 'c2', fromCardId: 'A', toCardId: 'C' },
  { id: 'c3', fromCardId: 'B', toCardId: 'D' },
  { id: 'c4', fromCardId: 'C', toCardId: 'D' },
  { id: 'c5', fromCardId: 'D', toCardId: 'E' },
]

describe('getAncestors', () => {
  it('returns empty set for a root node', () => {
    const ancestors = getAncestors('A', connections)
    expect(ancestors.size).toBe(0)
  })

  it('returns direct parent', () => {
    const ancestors = getAncestors('B', connections)
    expect(ancestors.has('A')).toBe(true)
    expect(ancestors.size).toBe(1)
  })

  it('returns transitive ancestors', () => {
    const ancestors = getAncestors('D', connections)
    expect(ancestors.has('A')).toBe(true)
    expect(ancestors.has('B')).toBe(true)
    expect(ancestors.has('C')).toBe(true)
    expect(ancestors.size).toBe(3)
  })

  it('returns all ancestors for a leaf', () => {
    const ancestors = getAncestors('E', connections)
    expect(ancestors.has('A')).toBe(true)
    expect(ancestors.has('B')).toBe(true)
    expect(ancestors.has('C')).toBe(true)
    expect(ancestors.has('D')).toBe(true)
    expect(ancestors.size).toBe(4)
  })

  it('does not include the card itself', () => {
    const ancestors = getAncestors('D', connections)
    expect(ancestors.has('D')).toBe(false)
  })
})

describe('getDescendants', () => {
  it('returns empty set for a leaf node', () => {
    const descendants = getDescendants('E', connections)
    expect(descendants.size).toBe(0)
  })

  it('returns all descendants from root', () => {
    const descendants = getDescendants('A', connections)
    expect(descendants.has('B')).toBe(true)
    expect(descendants.has('C')).toBe(true)
    expect(descendants.has('D')).toBe(true)
    expect(descendants.has('E')).toBe(true)
    expect(descendants.size).toBe(4)
  })

  it('returns transitive descendants from mid-node', () => {
    const descendants = getDescendants('B', connections)
    expect(descendants.has('D')).toBe(true)
    expect(descendants.has('E')).toBe(true)
    expect(descendants.size).toBe(2)
  })

  it('does not include the card itself', () => {
    const descendants = getDescendants('A', connections)
    expect(descendants.has('A')).toBe(false)
  })
})

describe('getLineage', () => {
  it('includes the card itself plus ancestors and descendants', () => {
    const lineage = getLineage('D', connections)
    expect(lineage.has('A')).toBe(true)
    expect(lineage.has('B')).toBe(true)
    expect(lineage.has('C')).toBe(true)
    expect(lineage.has('D')).toBe(true)
    expect(lineage.has('E')).toBe(true)
    expect(lineage.size).toBe(5)
  })

  it('for a root, includes self plus all descendants', () => {
    const lineage = getLineage('A', connections)
    expect(lineage.has('A')).toBe(true)
    expect(lineage.has('B')).toBe(true)
    expect(lineage.has('C')).toBe(true)
    expect(lineage.has('D')).toBe(true)
    expect(lineage.has('E')).toBe(true)
    expect(lineage.size).toBe(5)
  })

  it('for a leaf, includes self plus all ancestors', () => {
    const lineage = getLineage('E', connections)
    expect(lineage.has('A')).toBe(true)
    expect(lineage.has('B')).toBe(true)
    expect(lineage.has('C')).toBe(true)
    expect(lineage.has('D')).toBe(true)
    expect(lineage.has('E')).toBe(true)
    expect(lineage.size).toBe(5)
  })

  it('handles empty connections', () => {
    const lineage = getLineage('X', [])
    expect(lineage.has('X')).toBe(true)
    expect(lineage.size).toBe(1)
  })
})
