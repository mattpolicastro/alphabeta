// The evidence half of the funnel: an evidence tool ends in "attach to a bet →",
// which lands here as
//   /bet/attach?from=<tool>&v=1&…
// A result is evidence on a bet that already exists — never a new commitment, so
// nothing here mints, and nothing here is accent. The URL is the contract (CLAUDE.md,
// routing policy): the query string is the tool's canonical schema, the result is
// recomputed in-app from those inputs, and the SHA-256 of the canonical string is
// computed here too — the app never trusts a seal it did not verify.
// Shape mirrors src/funnel.ts (parser registry, stubs that refuse, same refusal style).
import type { Node } from '@xyflow/react'
import type { BetRecord, EvidenceRecord, EvidenceTool, EvidenceVerdict } from './model'

export const ATTACH_PATH = '/bet/attach'
export const LAB_ORIGIN = 'https://alphabeta.tools'

export interface AttachParsed {
  ok: true
  tool: EvidenceTool
  v: number
  params: Record<string, number | string>
  canonical: string
  seal?: string
  summary: string
  verdict?: EvidenceVerdict
}
export type AttachResult = AttachParsed | { ok: false; error: string }

interface ToolParser {
  v: number
  wired: boolean // false = registered stub; parse() refuses with a message
  parse(p: URLSearchParams): { ok: true; params: AttachParsed['params']; canonical: string; summary: string; verdict?: EvidenceVerdict } | { ok: false; error: string }
}

// ── srm: the chi-square core ─────────────────────────────────────────
// Ported from packages/analysis/src/srm.ts @ 25ec610 (srm, chiSquareSf, gammaQ,
// logGamma) — Pearson's chi-square goodness of fit against the intended allocation,
// no continuity correction (scipy.stats.chisquare); upper tail from the regularized
// incomplete gamma (Numerical Recipes §6.2). Checked against the lab bundle
// apps/landing/lab/srm/analysis.js to 1e-9 in src/__tests__/attach.test.ts.

export interface SrmInput { expected: number[]; observed: number[]; alpha?: number }
export interface SrmResult {
  chi2: number
  df: number
  pValue: number
  expectedShares: number[]
  expectedCounts: number[]
  verdict: 'ok' | 'mismatch'
  threshold: number
  total: number
}

function assertFinite(name: string, v: unknown): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new RangeError(`${name} must be a finite number`)
}

export function srm(input: SrmInput): SrmResult {
  const { expected, observed } = input
  const threshold = input.alpha ?? 0.001
  if (!Array.isArray(expected) || !Array.isArray(observed)) throw new RangeError('expected and observed must be arrays')
  if (expected.length < 2) throw new RangeError('at least two arms are needed')
  if (expected.length !== observed.length) throw new RangeError(`expected has ${expected.length} arms but observed has ${observed.length}`)
  expected.forEach((w, i) => { assertFinite(`expected[${i}]`, w); if (w <= 0) throw new RangeError(`expected[${i}] must be positive`) })
  observed.forEach((o, i) => { assertFinite(`observed[${i}]`, o); if (o < 0) throw new RangeError(`observed[${i}] must be non-negative`) })
  assertFinite('alpha', threshold)
  if (threshold <= 0 || threshold >= 1) throw new RangeError('alpha must be strictly between 0 and 1')
  const total = observed.reduce((a, b) => a + b, 0)
  if (total <= 0) throw new RangeError('observed visitors must total more than zero')
  const wSum = expected.reduce((a, b) => a + b, 0)
  const expectedShares = expected.map((w) => w / wSum)
  const expectedCounts = expectedShares.map((s) => s * total)
  const chi2 = observed.reduce((acc, o, i) => acc + ((o - expectedCounts[i]) ** 2) / expectedCounts[i], 0)
  const df = observed.length - 1
  const pValue = chiSquareSf(chi2, df)
  return { chi2, df, pValue, expectedShares, expectedCounts, verdict: pValue < threshold ? 'mismatch' : 'ok', threshold, total }
}

export function chiSquareSf(x: number, df: number): number {
  assertFinite('x', x); assertFinite('df', df)
  if (df <= 0) throw new RangeError('df must be positive')
  if (x <= 0) return 1
  return gammaQ(df / 2, x / 2)
}

export function gammaQ(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN
  if (x === 0) return 1
  return x < a + 1 ? 1 - gammaSeriesP(a, x) : gammaCfQ(a, x)
}

const EPS = 1e-16
const FPMIN = 1e-300

function gammaSeriesP(a: number, x: number): number {
  let ap = a, sum = 1 / a, del = sum
  for (let n = 0; n < 1000; n++) {
    ap += 1; del *= x / ap; sum += del
    if (Math.abs(del) < Math.abs(sum) * EPS) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

function gammaCfQ(a: number, x: number): number {
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

export function logGamma(z: number): number {
  const g = 7
  const coef = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = coef[0]
  for (let i = 1; i < g + 2; i++) x += coef[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

// ── srm: the URL contract ────────────────────────────────────────────
// Exactly what apps/landing/lab/srm emits: KEYS order v, expected, observed, alpha;
// lists joined by a literal comma (the parser also takes %2C and whitespace);
// numbers in shortest exact form. The canonical string rebuilt here is what the lab
// sealed, so a seal= can be verified byte for byte.

const SRM_KEYS = ['expected', 'observed', 'alpha'] as const
// the lab's own `enc`: String(Number(x)), lists joined by ','
const enc = (v: number | number[]) => (Array.isArray(v) ? v.map((x) => String(Number(x))).join(',') : String(Number(v)))

function readList(p: URLSearchParams, k: string): { ok: true; list: number[] } | { ok: false; error: string } {
  const s = p.get(k)
  if (s === null || s.trim() === '') return { ok: false, error: `srm: missing ${k}` }
  const parts = s.split(/[,\s]+/).filter((x) => x !== '')
  const list = parts.map(Number)
  const bad = parts.filter((_, i) => !Number.isFinite(list[i]))
  if (bad.length) return { ok: false, error: `srm: ${k} has a non-numeric entry (${bad.map((b) => `"${b}"`).join(', ')})` }
  return { ok: true, list }
}

const srmTool: ToolParser = {
  v: 1,
  wired: true,
  parse(p) {
    const missing = SRM_KEYS.filter((k) => p.get(k) === null || p.get(k)!.trim() === '')
    if (missing.length) return { ok: false, error: `srm: missing ${missing.join(', ')}` }
    const e = readList(p, 'expected'); if (e.ok === false) return e
    const o = readList(p, 'observed'); if (o.ok === false) return o
    const alpha = Number(p.get('alpha'))
    if (!Number.isFinite(alpha)) return { ok: false, error: 'srm: alpha must be a number in (0, 1)' }
    let r: SrmResult
    try { r = srm({ expected: e.list, observed: o.list, alpha }) } catch (err) { return { ok: false, error: `srm: ${(err as Error).message}` } }
    const params = { expected: enc(e.list), observed: enc(o.list), alpha: Number(enc(alpha)) }
    const canonical = `v=1&expected=${params.expected}&observed=${params.observed}&alpha=${enc(alpha)}`
    return { ok: true, params, canonical, summary: attachSummary('srm', params, r), verdict: r.verdict }
  },
}

// ── the summary line ─────────────────────────────────────────────────
// One mono line the cockpit shows. Formatting follows the lab page (p in exponent
// form under 1e-4) so the receipt and the row read the same.
const pv = (p: number) => (p < 1e-4 ? p.toExponential(2) : p.toFixed(4))

export function attachSummary(tool: EvidenceTool, params: Record<string, number | string>, computed: unknown): string {
  if (tool === 'srm') {
    const r = computed as SrmResult
    const tail = r.verdict === 'mismatch'
      ? 'mismatch — the split is not the one configured'
      : 'ok — the split is consistent with the configured allocation'
    return `SRM: χ² ${r.chi2.toFixed(1)} on ${r.df} df, p ${pv(r.pValue)} at α ${enc(r.threshold)} → ${tail}`
  }
  // stubs never reach here; the line still says what it is if a record arrives from elsewhere
  const kv = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(' ')
  return `${LAB_LABEL[tool]}: ${kv}`
}

export const LAB_LABEL: Record<EvidenceTool, string> = { srm: 'SRM', results: 'results', bayes: 'bayes', sequential: 'sequential', 'pre-post': 'pre/post' }

// ── registry ─────────────────────────────────────────────────────────
// Tools the attach funnel accepts, by `from=`. Stubs refuse with a message rather
// than guess at a schema — their parsers land as the lab pages finish.
const notYet = (tool: string): ToolParser => ({
  v: 1,
  wired: false,
  parse: () => ({ ok: false, error: `${tool}: the lab tool exists but its attach-as-evidence schema is not wired yet` }),
})

export const ATTACH_TOOLS: Record<EvidenceTool, ToolParser> = {
  srm: srmTool,
  // STUB — /lab/results, /lab/bayes, /lab/sequential are being built; their query schemas are not final.
  results: notYet('results'),
  bayes: notYet('bayes'),
  sequential: notYet('sequential'),
  // STUB — /lab/pre-post is series-based and has no URL contract yet.
  'pre-post': notYet('pre-post'),
}

export const SUPPORTED_ATTACH_TOOLS = (Object.keys(ATTACH_TOOLS) as EvidenceTool[]).filter((k) => ATTACH_TOOLS[k].wired)

export function parseAttach(search: string): AttachResult {
  const p = new URLSearchParams(search)
  const from = p.get('from')
  if (!from) return { ok: false, error: 'attach to a bet: missing from=<tool>' }
  const tool = (ATTACH_TOOLS as Record<string, ToolParser>)[from]
  if (!tool) return { ok: false, error: `attach to a bet: unknown tool "${from}"` }
  const vRaw = p.get('v')
  if (vRaw === null) return { ok: false, error: `${from}: missing v= (schema version)` }
  const v = Number(vRaw)
  if (v !== tool.v) return { ok: false, error: `${from}: schema v${vRaw} not supported (this app reads v${tool.v})` }
  const r = tool.parse(p)
  if (r.ok === false) return r
  const out: AttachParsed = { ok: true, tool: from as EvidenceTool, v, params: r.params, canonical: r.canonical, summary: r.summary }
  if (r.verdict) out.verdict = r.verdict
  const seal = p.get('seal')
  if (seal && /^[0-9a-f]{64}$/i.test(seal)) out.seal = seal.toLowerCase()
  return out
}

// Is this location an attach landing? Pure so boot can test it.
export function isAttachLanding(pathname: string, search: string): boolean {
  return pathname.replace(/\/+$/, '') === ATTACH_PATH && new URLSearchParams(search).has('from')
}

// ── the record ───────────────────────────────────────────────────────
// SHA-256 of a plain string — the lab seals the canonical query this way (not the
// canonical-JSON fingerprint src/portable.ts uses for boards), so the same function
// here reproduces its receipt.
export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// NB: not crypto.randomUUID() — unavailable on insecure origins (LAN/tailnet HTTP)
const mkId = () => `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export async function mintEvidence(parsed: AttachParsed, ts = new Date().toISOString(), id = mkId()): Promise<EvidenceRecord> {
  const rec: EvidenceRecord = {
    id, ts, tool: parsed.tool, v: parsed.v, params: parsed.params, canonical: parsed.canonical,
    hash: await sha256(parsed.canonical), summary: parsed.summary,
  }
  if (parsed.seal) rec.seal = parsed.seal
  if (parsed.verdict) rec.verdict = parsed.verdict
  return rec
}

// sealed · verified when the lab's seal is the hash we computed; unsealed otherwise
// (no seal sent, or one that does not match — either way the app vouches only for its own hash).
export type SealState = 'verified' | 'mismatch' | 'unsealed'
export function sealState(e: Pick<EvidenceRecord, 'hash' | 'seal'>): SealState {
  if (!e.seal) return 'unsealed'
  return e.seal === e.hash ? 'verified' : 'mismatch'
}

export const labUrl = (e: Pick<EvidenceRecord, 'tool' | 'canonical'>) => `${LAB_ORIGIN}/lab/${e.tool}/?${e.canonical}`

// ── which bets can take evidence ─────────────────────────────────────
// Evidence arrives after the lock by definition: locked and running bets first,
// resolved ones after (post-hoc), drafts and ready bets excluded with a count.
export interface Candidate { id: string; tag: string; bet: BetRecord }
export interface Candidates { open: Candidate[]; resolved: Candidate[]; preLock: number }

export function attachCandidates(nodes: Node[]): Candidates {
  const out: Candidates = { open: [], resolved: [], preLock: 0 }
  for (const n of nodes) {
    const bet = (n.data as any)?.bet as BetRecord | undefined
    if (!bet) continue
    const c = { id: n.id, tag: `B${(n.data as any).seq ?? '·'}`, bet }
    if (bet.status === 'locked' || bet.status === 'running') out.open.push(c)
    else if (bet.status === 'resolved') out.resolved.push(c)
    else out.preLock++
  }
  return out
}
