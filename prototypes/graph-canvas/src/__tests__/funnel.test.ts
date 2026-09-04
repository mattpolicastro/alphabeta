import { describe, expect, it } from 'vitest'
import { SUPPORTED_TOOLS, detectableLift, isFunnelLanding, parseFunnel, perArm, sampleSizeOrigin, specLine } from '../funnel'

// exactly what apps/landing/lab/sample-size emits on "Lock as bet →"
const Q = 'from=sample-size&v=1&baseline=0.02&mde=0.1&mdeKind=relative&variants=2&tails=2&alpha=0.05&power=0.8'

describe('parseFunnel — sample-size', () => {
  it('mints an ab draft with the inputs on the instrument and the MDE as magnitude', () => {
    const r = parseFunnel(Q)
    if (r.ok === false) throw new Error(r.error)
    expect(r.bet.status).toBe('draft')
    expect(r.bet.instrument).toEqual({ type: 'ab', spec: { from: 'sample-size', v: 1, params: { baseline: 0.02, mde: 0.1, mdeKind: 'relative', variants: 2, tails: 2, alpha: 0.05, power: 0.8 } } })
    expect(r.bet.magnitude).toBe('≥ 10% relative lift')
    expect(r.bet.metric).toMatch(/not yet declared/)
    expect(r.bet.origin).toBe('sized in the lab · 80,682 per arm')
  })
  it('sizes runtime when traffic is present', () => {
    const r = parseFunnel(Q + '&traffic=5000')
    if (r.ok === false) throw new Error(r.error)
    expect(r.bet.origin).toBe('sized in the lab · 80,682 per arm · 33 days at 5,000/day')
    expect(r.spec.params.traffic).toBe(5000)
  })
  it('matches the lab oracle (apps/landing/lab/sample-size/analysis.js) to the integer', () => {
    // power.prop.test(p1=.1, p2=.12, sig.level=.05, power=.8) → n = 3841 per arm
    expect(perArm({ baseline: 0.1, mde: 0.2, mdeKind: 'relative', variants: 2, tails: 2, alpha: 0.05, power: 0.8 })).toBe(3841)
    // three arms, one-tailed, Bonferroni α/2
    expect(perArm({ baseline: 0.05, mde: 0.15, mdeKind: 'relative', variants: 3, tails: 1, alpha: 0.05, power: 0.9 })).toBe(19000)
  })
  it('keeps a seal only when it is a sha256', () => {
    const h = 'a'.repeat(64)
    const ok = parseFunnel(Q + '&seal=' + h.toUpperCase())
    expect(ok.ok && ok.spec.sealed).toBe(h)
    const bad = parseFunnel(Q + '&seal=nope')
    expect(bad.ok && bad.spec.sealed).toBeUndefined()
  })
  it('absolute MDE reads in points', () => {
    const r = parseFunnel(Q.replace('mdeKind=relative', 'mdeKind=absolute').replace('mde=0.1', 'mde=0.002'))
    expect(r.ok && r.bet.magnitude).toBe('≥ 0.2 pts absolute')
  })
})

describe('parseFunnel — refusals', () => {
  it('missing v', () => {
    const r = parseFunnel(Q.replace('&v=1', ''))
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.error).toMatch(/missing v=/)
  })
  it('wrong v', () => {
    const r = parseFunnel(Q.replace('v=1', 'v=2'))
    expect(r.ok === false && r.error).toMatch(/v2 not supported/)
  })
  it('unknown tool', () => {
    expect(parseFunnel('from=bayes&v=1')).toMatchObject({ ok: false, error: expect.stringMatching(/unknown tool "bayes"/) })
  })
  it('no from at all', () => {
    expect(parseFunnel('v=1&baseline=0.02')).toMatchObject({ ok: false, error: expect.stringMatching(/missing from/) })
  })
  it('malformed numbers name the fields', () => {
    const r = parseFunnel(Q.replace('baseline=0.02', 'baseline=two').replace('power=0.8', 'power='))
    expect(r.ok === false && r.error).toMatch(/baseline, power/)
  })
  it('tails must be 1 or 2; traffic must be positive', () => {
    expect(parseFunnel(Q.replace('tails=2', 'tails=3'))).toMatchObject({ ok: false, error: expect.stringMatching(/tails/) })
    expect(parseFunnel(Q + '&traffic=-4')).toMatchObject({ ok: false, error: expect.stringMatching(/traffic/) })
  })
  it('inputs that do not size still mint, with an honest origin', () => {
    const r = parseFunnel(Q.replace('baseline=0.02', 'baseline=1.5'))
    expect(r.ok && r.bet.origin).toMatch(/did not size/)
  })
  it('registered stubs refuse rather than guess', () => {
    expect(parseFunnel('from=srm&v=1')).toMatchObject({ ok: false, error: expect.stringMatching(/srm: .*not wired/) })
    expect(SUPPORTED_TOOLS).toEqual(['sample-size', 'detectable-lift'])
  })
})

// exactly what apps/landing/lab/detectable-lift emits on "Lock as bet →" (its KEYS order)
const DL = 'from=detectable-lift&v=1&baseline=0.02&traffic=10000&days=14&variants=2&tails=2&alpha=0.05&power=0.8'

describe('parseFunnel — detectable-lift', () => {
  it('mints an ab draft with the MDE as magnitude and the traffic in the origin', () => {
    const r = parseFunnel(DL)
    if (r.ok === false) throw new Error(r.error)
    expect(r.bet.status).toBe('draft')
    expect(r.bet.instrument).toEqual({ type: 'ab', spec: { from: 'detectable-lift', v: 1, params: { baseline: 0.02, traffic: 10000, days: 14, variants: 2, tails: 2, alpha: 0.05, power: 0.8 } } })
    expect(r.bet.magnitude).toBe('≥ 10.75% relative lift, the smallest this traffic can detect')
    expect(r.bet.origin).toBe('sized in the lab · 70,000 per arm over 14 days at 10,000/day')
  })
  it('matches the lab bundle (apps/landing/lab/detectable-lift/analysis.js) on three cases', () => {
    // values printed by the bundle's detectableLift() on 2026-09-04
    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9)
    const c1 = detectableLift({ baseline: 0.02, traffic: 10000, days: 14, variants: 2, tails: 2, alpha: 0.05, power: 0.8 })!
    near(c1.mdeRelative, 0.1075472798630476); near(c1.mdeAbsolute, 0.002150945597260954); expect(c1.perVariant).toBe(70000); expect(c1.total).toBe(140000)
    const c2 = detectableLift({ baseline: 0.05, traffic: 3000, days: 21, variants: 3, tails: 1, alpha: 0.05, power: 0.9 })!
    near(c2.mdeRelative, 0.14244022529317096); near(c2.mdeAbsolute, 0.007122011264658543); expect(c2.perVariant).toBe(21000); expect(c2.total).toBe(63000)
    const c3 = detectableLift({ baseline: 0.12, traffic: 800, days: 30, variants: 2, tails: 2, alpha: 0.1, power: 0.8 })!
    near(c3.mdeRelative, 0.08855915871768287); near(c3.mdeAbsolute, 0.01062709904612194); expect(c3.perVariant).toBe(12000); expect(c3.total).toBe(24000)
  })
  it('refuses missing fields, bad tails, non-positive traffic', () => {
    expect(parseFunnel(DL.replace('&days=14', ''))).toMatchObject({ ok: false, error: expect.stringMatching(/days/) })
    expect(parseFunnel(DL.replace('tails=2', 'tails=0'))).toMatchObject({ ok: false, error: expect.stringMatching(/tails/) })
    expect(parseFunnel(DL.replace('traffic=10000', 'traffic=0'))).toMatchObject({ ok: false, error: expect.stringMatching(/positive/) })
  })
  it('inputs that cannot detect any lift still mint, with an honest origin', () => {
    // the bundle throws "1 visitors per variant cannot detect any lift" here; 21 per arm still solves (lift 16.22×)
    const r = parseFunnel(DL.replace('traffic=10000', 'traffic=1').replace('days=14', 'days=1'))
    expect(r.ok && r.bet.origin).toMatch(/did not solve/)
    expect(r.ok && r.bet.magnitude).toMatch(/did not solve/)
    expect(detectableLift({ baseline: 0.02, traffic: 1, days: 1, variants: 2, tails: 2, alpha: 0.05, power: 0.8 })).toBeNull()
    expect(detectableLift({ baseline: 0.02, traffic: 3, days: 14, variants: 2, tails: 2, alpha: 0.05, power: 0.8 })!.mdeRelative).toBeCloseTo(16.224208445010113, 9)
  })
})

describe('landing + spec line', () => {
  it('recognizes /bet/new with a from=', () => {
    expect(isFunnelLanding('/bet/new', '?' + Q)).toBe(true)
    expect(isFunnelLanding('/bet/new/', '?' + Q)).toBe(true)
    expect(isFunnelLanding('/bet/new', '')).toBe(false)
    expect(isFunnelLanding('/', '?' + Q)).toBe(false)
  })
  it('renders a lab spec as one mono line, string specs untouched', () => {
    expect(specLine('50/50 by visitor')).toBe('50/50 by visitor')
    expect(specLine({ from: 'sample-size', v: 1, params: { baseline: 0.02, mde: 0.1 }, note: '14 days' })).toBe('from /lab/sample-size (v1): baseline=0.02 mde=0.1 — 14 days')
    expect(specLine({ from: 'sample-size', v: 1, params: {}, sealed: 'abcdef0123456789' })).toMatch(/sealed abcdef01…$/)
    expect(specLine(undefined)).toBeNull()
  })
  it('origin note is built from the same sizing', () => {
    expect(sampleSizeOrigin({ baseline: 0.02, mde: 0.1, mdeKind: 'relative', variants: 2, tails: 2, alpha: 0.05, power: 0.8, traffic: 1000 })).toBe('sized in the lab · 80,682 per arm · 162 days at 1,000/day')
  })
})
