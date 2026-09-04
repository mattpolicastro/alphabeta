import { describe, expect, it } from 'vitest'
import type { Capability } from '../capabilities'
import { LOOP, stepStatus, type LoopStep } from '../loop'

const reg: Record<string, Capability> = {
  a: { id: 'a', kind: 'place', name: 'A', status: 'live' },
  b: { id: 'b', kind: 'face', name: 'B', status: 'partial', gap: 'first gap' },
  c: { id: 'c', kind: 'face', name: 'C', status: 'partial', gap: 'second gap' },
  d: { id: 'd', kind: 'tray', name: 'D', status: 'stub' },
  e: { id: 'e', kind: 'document', name: 'E', status: 'planned' },
}
const lookup = (id: string) => reg[id]
const step = (...dependsOn: string[]): LoopStep => ({ id: 'map', name: 'x', line: '', dependsOn })

describe('stepStatus rollup', () => {
  it('all live → live', () => {
    expect(stepStatus(step('a', 'a'), lookup)).toEqual({ status: 'live' })
  })

  it('any partial → partial, carrying the first gap in dependency order', () => {
    expect(stepStatus(step('a', 'b', 'c'), lookup)).toEqual({ status: 'partial', gap: 'first gap' })
    expect(stepStatus(step('c', 'b'), lookup)).toEqual({ status: 'partial', gap: 'second gap' })
  })

  it('any stub outranks partial', () => {
    expect(stepStatus(step('b', 'd', 'a'), lookup).status).toBe('stub')
  })

  it('any planned outranks everything', () => {
    expect(stepStatus(step('a', 'b', 'd', 'e'), lookup).status).toBe('planned')
    expect(stepStatus(step('e', 'a'), lookup).status).toBe('planned')
  })

  it('every step resolves against the real registry', () => {
    for (const s of LOOP) expect(['live', 'partial', 'stub', 'planned']).toContain(stepStatus(s).status)
  })
})
