// The funnel: a lab tool ends in "lock as bet →", which lands here as
//   /bet/new?from=<tool>&v=1&…
// The URL is the contract (CLAUDE.md, routing policy): the query string is the
// tool's canonical input schema, so the draft this mints carries the inputs
// verbatim on the instrument, not a re-typed spec line.
//
// Sizing math adapted from apps/landing/lab/sample-size/analysis.js, itself
// adapted from apps/web/lib/stats/powerCalculator.ts @ d9d8ba2 — R's
// power.prop.test conventions, Acklam probit — so the origin note quotes the
// same per-arm number the lab showed.
import type { BetRecord, LabSpec } from './model'

export const FUNNEL_PATH = '/bet/new'

export type FunnelResult =
  | { ok: true; spec: LabSpec; bet: BetRecord }
  | { ok: false; error: string }

interface ToolParser {
  v: number
  wired: boolean // false = registered stub; parse() refuses with a message
  // returns the bet fields the tool can fill, or a refusal
  parse(p: URLSearchParams): { ok: true; params: LabSpec['params']; bet: Partial<BetRecord> } | { ok: false; error: string }
}

// ── sample-size ──────────────────────────────────────────────────────

export interface SampleSizeParams {
  baseline: number
  mde: number
  mdeKind: 'relative' | 'absolute'
  variants: number
  tails: 1 | 2
  alpha: number
  power: number
  traffic?: number
}

const num = (p: URLSearchParams, k: string): number | null => {
  const s = p.get(k)
  if (s === null || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

function readSampleSize(p: URLSearchParams): { ok: true; params: SampleSizeParams } | { ok: false; error: string } {
  const bad: string[] = []
  const req = (k: string) => {
    const n = num(p, k)
    if (n === null || Number.isNaN(n)) bad.push(k)
    return n ?? NaN
  }
  const baseline = req('baseline'), mde = req('mde'), variants = req('variants'), tails = req('tails'), alpha = req('alpha'), power = req('power')
  const mdeKindRaw = p.get('mdeKind')
  if (mdeKindRaw !== 'relative' && mdeKindRaw !== 'absolute') bad.push('mdeKind')
  if (bad.length) return { ok: false, error: `sample-size: missing or non-numeric ${bad.join(', ')}` }
  if (tails !== 1 && tails !== 2) return { ok: false, error: 'sample-size: tails must be 1 or 2' }
  const t = num(p, 'traffic')
  if (t !== null && (Number.isNaN(t) || t <= 0)) return { ok: false, error: 'sample-size: traffic must be a positive number' }
  const params: SampleSizeParams = { baseline, mde, mdeKind: mdeKindRaw as 'relative' | 'absolute', variants, tails, alpha, power }
  if (t !== null) params.traffic = Math.round(t)
  return { ok: true, params }
}

// Acklam's rational approximation to the inverse normal CDF (rel. error < 1.15e-9).
export function probit(p: number): number {
  if (!(p > 0 && p < 1)) return NaN
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const pLow = 0.02425
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - pLow) {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  const q = p - 0.5, r = q * q
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

// Per-arm n for a two-proportion z-test (R power.prop.test: pooled under H0,
// unpooled under H1, no continuity correction, Bonferroni across arms).
export const perArm = (s: SampleSizeParams): number => Math.ceil(perArmExact(s))

// The un-ceiled n — what detectableLift bisects on.
export function perArmExact(s: SampleSizeParams): number {
  const p1 = s.baseline
  const p2 = s.mdeKind === 'relative' ? p1 * (1 + s.mde) : p1 + s.mde
  if (!(p1 > 0 && p1 < 1) || !(p2 > 0 && p2 < 1) || !(s.alpha > 0 && s.alpha < 1) || !(s.power > 0 && s.power < 1)) return NaN
  if (!Number.isInteger(s.variants) || s.variants < 2 || s.mde === 0) return NaN
  const alphaPer = s.alpha / (s.variants - 1)
  if (s.power <= alphaPer) return NaN
  const zA = probit(1 - alphaPer / s.tails), zB = probit(s.power)
  const delta = Math.abs(p2 - p1), pSum = p1 + p2
  const sdNull = Math.sqrt(pSum * (1 - pSum / 2))
  const sdAlt = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
  return ((zA * sdNull + zB * sdAlt) / delta) ** 2
}

const fmt = (n: number) => n.toLocaleString('en-US')
const pct = (x: number) => `${Number((x * 100).toFixed(3))}%`

export function sampleSizeMagnitude(s: SampleSizeParams): string {
  return s.mdeKind === 'relative' ? `≥ ${pct(s.mde)} relative lift` : `≥ ${Number((s.mde * 100).toFixed(3))} pts absolute`
}

export function sampleSizeOrigin(s: SampleSizeParams): string {
  const n = perArm(s)
  if (Number.isNaN(n)) return 'sized in the lab · inputs did not size (check baseline / MDE / power)'
  const parts = ['sized in the lab', `${fmt(n)} per arm`]
  if (s.traffic) parts.push(`${fmt(Math.ceil((n * s.variants) / s.traffic))} days at ${fmt(s.traffic)}/day`)
  return parts.join(' · ')
}

const sampleSize: ToolParser = {
  v: 1,
  wired: true,
  parse(p) {
    const r = readSampleSize(p)
    if (r.ok === false) return r
    const s = r.params
    return {
      ok: true,
      params: { ...s } as LabSpec['params'],
      bet: {
        direction: 'lift',
        magnitude: sampleSizeMagnitude(s),
        origin: sampleSizeOrigin(s),
        mechanism: '',
      },
    }
  },
}

// ── detectable-lift ──────────────────────────────────────────────────
// The inverse of sample-size: the traffic is fixed, solve for the smallest lift.

export interface DetectableLiftParams {
  baseline: number
  traffic: number // visitors per day, all arms
  days: number
  variants: number
  tails: 1 | 2
  alpha: number
  power: number
}

export interface DetectableLiftResult {
  mdeRelative: number
  mdeAbsolute: number
  perVariant: number
  total: number
}

// Ported from packages/analysis/src/power.ts @ 25ec610 (detectableLift): bisection
// on the relative lift, since the exact per-arm n is strictly decreasing in it.
// Bracket (0, (1 − p1)/p1); closes at 1e-12 relative-lift units. Returns null where
// the package throws (invalid inputs, or traffic that cannot detect any lift).
export function detectableLift(d: DetectableLiftParams): DetectableLiftResult | null {
  if (!(d.traffic > 0) || !(d.days > 0) || !(d.baseline > 0 && d.baseline < 1)) return null
  const base: SampleSizeParams = { baseline: d.baseline, mde: 0.5, mdeKind: 'relative', variants: d.variants, tails: d.tails, alpha: d.alpha, power: d.power }
  const maxLift = (1 - d.baseline) / d.baseline
  if (Number.isNaN(perArmExact({ ...base, mde: Math.min(0.5, maxLift / 2) }))) return null
  const perVariant = Math.ceil((d.traffic * d.days) / d.variants)
  const nAt = (lift: number) => perArmExact({ ...base, mde: lift })
  let hi = maxLift * (1 - 1e-12)
  if (nAt(hi) > perVariant) return null
  let lo = 0
  for (let i = 0; i < 200 && hi - lo > 1e-12; i++) {
    const mid = (lo + hi) / 2
    if (nAt(mid) > perVariant) lo = mid
    else hi = mid
  }
  return { mdeRelative: hi, mdeAbsolute: d.baseline * hi, perVariant, total: perVariant * d.variants }
}

function readDetectableLift(p: URLSearchParams): { ok: true; params: DetectableLiftParams } | { ok: false; error: string } {
  const bad: string[] = []
  const req = (k: string) => {
    const n = num(p, k)
    if (n === null || Number.isNaN(n)) bad.push(k)
    return n ?? NaN
  }
  const baseline = req('baseline'), traffic = req('traffic'), days = req('days'), variants = req('variants'), tails = req('tails'), alpha = req('alpha'), power = req('power')
  if (bad.length) return { ok: false, error: `detectable-lift: missing or non-numeric ${bad.join(', ')}` }
  if (tails !== 1 && tails !== 2) return { ok: false, error: 'detectable-lift: tails must be 1 or 2' }
  if (traffic <= 0 || days <= 0) return { ok: false, error: 'detectable-lift: traffic and days must be positive' }
  // the lab rounds these on the way to the URL; do the same on the way in
  return { ok: true, params: { baseline, traffic: Math.round(traffic), days: Math.round(days), variants: Math.round(variants), tails, alpha, power } }
}

// two decimals, trailing zeros dropped — the lab's own rendering
const pct2 = (x: number) => `${(x * 100).toFixed(2).replace(/\.?0+$/, '')}%`

export function detectableLiftMagnitude(d: DetectableLiftParams): string {
  const r = detectableLift(d)
  return r ? `≥ ${pct2(r.mdeRelative)} relative lift, the smallest this traffic can detect` : '? (inputs did not solve)'
}

export function detectableLiftOrigin(d: DetectableLiftParams): string {
  const r = detectableLift(d)
  if (!r) return 'sized in the lab · inputs did not solve (check baseline / traffic / power)'
  return `sized in the lab · ${fmt(r.perVariant)} per arm over ${fmt(d.days)} days at ${fmt(d.traffic)}/day`
}

const detectableLiftTool: ToolParser = {
  v: 1,
  wired: true,
  parse(p) {
    const r = readDetectableLift(p)
    if (r.ok === false) return r
    const d = r.params
    return {
      ok: true,
      params: { ...d } as LabSpec['params'],
      bet: { direction: 'lift', magnitude: detectableLiftMagnitude(d), origin: detectableLiftOrigin(d), mechanism: '' },
    }
  },
}

// ── registry ─────────────────────────────────────────────────────────
// Tools the funnel accepts, by `from=`. Stubs refuse with a message rather than
// guess at a schema — another agent adds them as the lab tools ship.
const notYet = (tool: string): ToolParser => ({
  v: 1,
  wired: false,
  parse: () => ({ ok: false, error: `${tool}: the lab tool exists but its lock-as-bet schema is not wired yet` }),
})

export const TOOLS: Record<string, ToolParser> = {
  'sample-size': sampleSize,
  'detectable-lift': detectableLiftTool,
  // STUB — /lab/srm: its funnel semantics are undecided ("attach as evidence" to a
  // running bet, not "lock as bet"), so it refuses rather than mint a draft.
  srm: notYet('srm'),
}

export const SUPPORTED_TOOLS = Object.keys(TOOLS).filter((k) => TOOLS[k].wired)

const DRAFT: BetRecord = {
  change: '(the change you are sizing — name it)',
  direction: 'lift',
  metric: '(metric not yet declared)',
  magnitude: '?',
  mechanism: '',
  foldIf: '(not yet declared)',
  surface: '',
  status: 'draft',
  outcome: null,
  criteria: {
    win: '(pre-register at lock)',
    inconclusive: '(pre-register at lock)',
    loss: '(pre-register at lock)',
  },
  deviation: null,
  learning: null,
}

export function parseFunnel(search: string): FunnelResult {
  const p = new URLSearchParams(search)
  const from = p.get('from')
  if (!from) return { ok: false, error: 'lock as bet: missing from=<tool>' }
  const tool = TOOLS[from]
  if (!tool) return { ok: false, error: `lock as bet: unknown tool "${from}"` }
  const vRaw = p.get('v')
  if (vRaw === null) return { ok: false, error: `${from}: missing v= (schema version)` }
  const v = Number(vRaw)
  if (v !== tool.v) return { ok: false, error: `${from}: schema v${vRaw} not supported (this app reads v${tool.v})` }
  const r = tool.parse(p)
  if (r.ok === false) return r
  const spec: LabSpec = { from, v, params: r.params }
  const seal = p.get('seal')
  if (seal && /^[0-9a-f]{64}$/i.test(seal)) spec.sealed = seal.toLowerCase()
  const bet: BetRecord = { ...DRAFT, ...r.bet, instrument: { type: 'ab', spec } }
  return { ok: true, spec, bet }
}

// Is this location a funnel landing? Pure so boot can test it.
export function isFunnelLanding(pathname: string, search: string): boolean {
  return pathname.replace(/\/+$/, '') === FUNNEL_PATH && new URLSearchParams(search).has('from')
}

// One mono line for the cockpit / lock moment when the spec came from a lab tool.
export function specLine(spec: string | LabSpec | undefined): string | null {
  if (!spec) return null
  if (typeof spec === 'string') return spec
  const kv = Object.entries(spec.params).map(([k, v]) => `${k}=${v}`).join(' ')
  const head = `from /lab/${spec.from} (v${spec.v}): ${kv}`
  const seal = spec.sealed ? ` · sealed ${spec.sealed.slice(0, 8)}…` : ''
  return spec.note ? `${head}${seal} — ${spec.note}` : `${head}${seal}`
}
