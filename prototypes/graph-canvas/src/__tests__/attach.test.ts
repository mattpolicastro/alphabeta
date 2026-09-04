import { describe, expect, it } from 'vitest'
import type { Node } from '@xyflow/react'
import { initialNodes } from '../data'
import { SUPPORTED_ATTACH_TOOLS, attachCandidates, isAttachLanding, labUrl, mintEvidence, parseAttach, sealState, srm } from '../attach'
// the built copy the static /lab/srm page loads — the port must agree with it
import { srm as bundleSrm } from '../../../../apps/landing/lab/srm/analysis.js'

// exactly what apps/landing/lab/srm emits on "Attach to a bet →" (its KEYS order)
const Q = 'from=srm&v=1&expected=50,50&observed=5000,4800&alpha=0.001'
const SEAL = '7f7b59a80941d30f257e58bd810c23f4dd7e377229b810ed5e196d41ac010af8' // sha256 of the canonical string above

describe('parseAttach — srm', () => {
  it('recomputes the result in-app and carries the canonical query', () => {
    const r = parseAttach(Q)
    if (r.ok === false) throw new Error(r.error)
    expect(r.tool).toBe('srm')
    expect(r.v).toBe(1)
    expect(r.params).toEqual({ expected: '50,50', observed: '5000,4800', alpha: 0.001 })
    expect(r.canonical).toBe('v=1&expected=50,50&observed=5000,4800&alpha=0.001')
    expect(r.verdict).toBe('ok')
    expect(r.summary).toBe('SRM: χ² 4.1 on 1 df, p 0.0434 at α 0.001 → ok — the split is consistent with the configured allocation')
  })
  it('a broken split reads as a mismatch', () => {
    const r = parseAttach(Q.replace('4800', '4600'))
    expect(r.ok && r.verdict).toBe('mismatch')
    expect(r.ok && r.summary).toBe('SRM: χ² 16.7 on 1 df, p 4.46e-5 at α 0.001 → mismatch — the split is not the one configured')
  })
  it('normalises the canonical the way the lab does (%2C, spaces, 0.50 → 0.5)', () => {
    const r = parseAttach('from=srm&v=1&expected=0.50%2C0.50&observed=5000,%204800&alpha=0.0010')
    expect(r.ok && r.canonical).toBe('v=1&expected=0.5,0.5&observed=5000,4800&alpha=0.001')
  })
  it('keeps a seal only when it is a sha256, lowercased', () => {
    const ok = parseAttach(Q + '&seal=' + SEAL.toUpperCase())
    expect(ok.ok && ok.seal).toBe(SEAL)
    const bad = parseAttach(Q + '&seal=nope')
    expect(bad.ok && bad.seal).toBeUndefined()
  })
  it('matches the lab bundle (apps/landing/lab/srm/analysis.js) on three cases to 1e-9', () => {
    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9)
    const cases = [
      { expected: [50, 50], observed: [5000, 4800], alpha: 0.001 },
      { expected: [50, 50], observed: [5000, 4600], alpha: 0.001 },
      { expected: [1, 1, 2], observed: [2400, 2550, 5050], alpha: 0.05 },
    ]
    for (const c of cases) {
      const a = srm(c), b = bundleSrm(c)
      near(a.chi2, b.chi2); near(a.pValue, b.pValue)
      expect(a.df).toBe(b.df); expect(a.verdict).toBe(b.verdict)
    }
    // values printed by the bundle on 2026-09-04 — scipy.stats.chisquare agrees
    near(srm(cases[0]).pValue, 0.04335175126086275)
    near(srm(cases[1]).pValue, 0.000044557090604056213)
    near(srm(cases[2]).chi2, 5.5); near(srm(cases[2]).pValue, 0.06392786120670763)
  })
})

describe('parseAttach — refusals', () => {
  it('missing v', () => {
    expect(parseAttach(Q.replace('&v=1', ''))).toMatchObject({ ok: false, error: expect.stringMatching(/missing v=/) })
  })
  it('wrong v', () => {
    expect(parseAttach(Q.replace('v=1', 'v=2'))).toMatchObject({ ok: false, error: expect.stringMatching(/v2 not supported/) })
  })
  it('wrong tool, and no from at all', () => {
    expect(parseAttach('from=sample-size&v=1')).toMatchObject({ ok: false, error: expect.stringMatching(/unknown tool "sample-size"/) })
    expect(parseAttach('v=1&expected=50,50')).toMatchObject({ ok: false, error: expect.stringMatching(/missing from/) })
  })
  it('missing fields are named', () => {
    expect(parseAttach('from=srm&v=1&expected=50,50')).toMatchObject({ ok: false, error: 'srm: missing observed, alpha' })
  })
  it('malformed lists name the entry', () => {
    expect(parseAttach(Q.replace('observed=5000,4800', 'observed=5000,many'))).toMatchObject({ ok: false, error: expect.stringMatching(/observed has a non-numeric entry \("many"\)/) })
  })
  it('length mismatch', () => {
    expect(parseAttach(Q.replace('expected=50,50', 'expected=1,1,2'))).toMatchObject({ ok: false, error: 'srm: expected has 3 arms but observed has 2' })
  })
  it('alpha outside (0, 1); a single arm; zero traffic', () => {
    expect(parseAttach(Q.replace('alpha=0.001', 'alpha=1'))).toMatchObject({ ok: false, error: expect.stringMatching(/alpha must be strictly between 0 and 1/) })
    expect(parseAttach('from=srm&v=1&expected=1&observed=100&alpha=0.05')).toMatchObject({ ok: false, error: expect.stringMatching(/at least two arms/) })
    expect(parseAttach(Q.replace('observed=5000,4800', 'observed=0,0'))).toMatchObject({ ok: false, error: expect.stringMatching(/total more than zero/) })
  })
  it('registered stubs refuse rather than guess', () => {
    for (const t of ['results', 'bayes', 'sequential', 'pre-post'])
      expect(parseAttach(`from=${t}&v=1&x=1`)).toMatchObject({ ok: false, error: `${t}: the lab tool exists but its attach-as-evidence schema is not wired yet` })
    expect(SUPPORTED_ATTACH_TOOLS).toEqual(['srm'])
  })
})

describe('the evidence record', () => {
  it('hashes the canonical itself and verifies the seal against that hash', async () => {
    const r = parseAttach(Q + '&seal=' + SEAL)
    if (r.ok === false) throw new Error(r.error)
    const e = await mintEvidence(r, '2026-09-04T12:00:00.000Z', 'ev-1')
    expect(e).toMatchObject({ id: 'ev-1', ts: '2026-09-04T12:00:00.000Z', tool: 'srm', v: 1, hash: SEAL, seal: SEAL, verdict: 'ok' })
    expect(sealState(e)).toBe('verified')
    expect(sealState({ ...e, seal: 'a'.repeat(64) })).toBe('mismatch')
    expect(sealState({ ...e, seal: undefined })).toBe('unsealed')
    expect(labUrl(e)).toBe('https://alphabeta.tools/lab/srm/?v=1&expected=50,50&observed=5000,4800&alpha=0.001')
  })
  it('recognizes /bet/attach with a from=', () => {
    expect(isAttachLanding('/bet/attach', '?' + Q)).toBe(true)
    expect(isAttachLanding('/bet/attach/', '?' + Q)).toBe(true)
    expect(isAttachLanding('/bet/attach', '')).toBe(false)
    expect(isAttachLanding('/bet/new', '?' + Q)).toBe(false)
  })
})

describe('attachCandidates — who can take evidence', () => {
  const seq = (nodes: Node[]): Node[] => { let b = 0; return nodes.map((n) => (n.type === 'bet' ? { ...n, data: { ...n.data, seq: ++b } } : n)) }
  it('locked and running first, resolved after, pre-lock bets counted out', () => {
    const c = attachCandidates(seq(initialNodes))
    expect(c.open.map((x) => x.id)).toEqual(['bet-3', 'bet-4'])
    expect(c.resolved.map((x) => x.id)).toEqual(['bet-7', 'bet-8', 'bet-5', 'bet-10', 'bet-9', 'bet-6'])
    expect(c.preLock).toBe(4) // bet-1, bet-2 (ready), bet-11, bet-12
    expect(c.open[0].tag).toBe('B2')
  })
  it('an empty board offers nothing', () => {
    expect(attachCandidates([])).toEqual({ open: [], resolved: [], preLock: 0 })
  })
})
