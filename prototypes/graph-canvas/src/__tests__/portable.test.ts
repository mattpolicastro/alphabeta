import { describe, expect, it } from 'vitest'
import { CURRENT_EXPORT_VERSION, exportBoard, fingerprint, importBoard, validateEnvelope } from '../portable'

const sample = {
  articulation: { change: 'swap the hero CTA', direction: 'lift', metric: 'checkout-start rate', magnitude: '8%', foldIf: 'less than 3% lift' },
  instrument: { type: 'ab', overrideReason: null, feasibility: { mde: 0.03, runtimeDays: 14 } },
  lockedAt: '2026-06-03T18:00:00.000Z',
}

describe('fingerprint', () => {
  it('returns a 64-char lowercase hex string', async () => {
    expect(await fingerprint(sample)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', async () => {
    expect(await fingerprint(sample)).toBe(await fingerprint(sample))
  })

  it('is stable across key reordering at any nesting level', async () => {
    const reordered = {
      lockedAt: sample.lockedAt,
      instrument: { feasibility: { runtimeDays: 14, mde: 0.03 }, overrideReason: null, type: 'ab' },
      articulation: { foldIf: 'less than 3% lift', magnitude: '8%', metric: 'checkout-start rate', direction: 'lift', change: 'swap the hero CTA' },
    }
    expect(await fingerprint(reordered)).toBe(await fingerprint(sample))
  })

  it('is stable across whitespace — a pretty-printed round trip hashes the same', async () => {
    const roundTripped = JSON.parse(JSON.stringify(sample, null, 2))
    expect(await fingerprint(roundTripped)).toBe(await fingerprint(sample))
  })

  it('changes when any field changes, including nested ones', async () => {
    const base = await fingerprint(sample)
    expect(await fingerprint({ ...sample, articulation: { ...sample.articulation, magnitude: '9%' } })).not.toBe(base)
    expect(await fingerprint({ ...sample, lockedAt: '2026-06-03T18:00:00.001Z' })).not.toBe(base)
    expect(await fingerprint({ ...sample, instrument: { ...sample.instrument, feasibility: { mde: 0.04, runtimeDays: 14 } } })).not.toBe(base)
  })
})

const nodes = [
  { id: 'g1', type: 'strat', position: { x: 0, y: 0 }, data: { strat: { kind: 'goal', title: 'grow' } } },
  { id: 'b1', type: 'bet', position: { x: 10, y: 400 }, data: { bet: { change: 'x', status: 'draft' } } },
] as any[]
const edges = [{ id: 'e1', source: 'g1', target: 'b1', data: { kind: 'elevation' } }] as any[]

describe('validateEnvelope', () => {
  it('rejects non-objects and missing versions', () => {
    expect(validateEnvelope(null)?.error).toBe('Not a valid JSON object')
    expect(validateEnvelope({ board: {} })?.error).toBe('Missing or invalid version field')
    expect(validateEnvelope({ version: '1' })?.error).toBe('Missing or invalid version field')
  })

  it('rejects a version newer than supported, naming both numbers', () => {
    const r = validateEnvelope({ version: CURRENT_EXPORT_VERSION + 1, app: 'alphabeta-canvas', board: { nodes: [], edges: [] } })
    expect(r?.ok).toBe(false)
    expect(r?.error).toContain(String(CURRENT_EXPORT_VERSION + 1))
    expect(r?.error).toContain(String(CURRENT_EXPORT_VERSION))
  })

  it('rejects exports from another app', () => {
    expect(validateEnvelope({ version: 1, app: 'something-else', fingerprint: 'a'.repeat(64), board: { nodes: [], edges: [] } })?.error)
      .toMatch(/Not an alphabeta-canvas export/)
  })

  it('accepts a freshly exported envelope', async () => {
    expect(validateEnvelope(await exportBoard(nodes, edges))).toBeNull()
  })
})

describe('exportBoard / importBoard', () => {
  it('round-trips through pretty-printed JSON', async () => {
    const env = await exportBoard(nodes, edges)
    expect(env.version).toBe(CURRENT_EXPORT_VERSION)
    expect(env.app).toBe('alphabeta-canvas')
    const r = await importBoard(JSON.parse(JSON.stringify(env, null, 2)))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.board).toEqual({ nodes, edges })
  })

  it('rejects a board altered after export', async () => {
    const env = JSON.parse(JSON.stringify(await exportBoard(nodes, edges)))
    env.board.nodes[1].data.bet.status = 'locked'
    const r = await importBoard(env)
    expect(r.ok).toBe(false)
    if (r.ok === false) expect(r.error).toMatch(/Fingerprint mismatch/)
  })

  it('surfaces validation errors', async () => {
    const r = await importBoard({ version: 99 })
    expect(r.ok).toBe(false)
    if (r.ok === false) expect(r.error).toMatch(/newer than this app supports/)
  })
})
