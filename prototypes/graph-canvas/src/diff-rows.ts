// The Diff, as pure rows: as-planned (the sealed commitment) against as-reported
// (what happened), each row marked held / amended / deviated / pending in mono.
// Structure adapted from apps/web/components/bet/{WagerStatic @ 98a7c16, CarriedWager
// @ bfb80fb} — the committed wager read back — extended with the reported column.
import { wagerSentence, type Amendment, type BetRecord } from './model'
import { committedFields } from './lock'
import { rungLine } from './instrument'
import { specLine } from './funnel'

export type Mark = 'held' | 'amended' | 'deviated' | 'pending'
export interface DiffRow { label: string; planned: string; reported: string; mark: Mark }

// which committed row an amendment's free-text `field` lands on
const FIELD_KEYS: Record<string, string[]> = {
  wager: ['change', 'metric', 'magnitude', 'direction', 'wager'],
  'fold-if': ['fold'],
  confidence: ['confidence'],
  rung: ['instrument', 'runtime', 'sample', 'spec', 'rung', 'split', 'traffic', 'duration', 'allocation'],
  expectation: ['expectation'],
}
export function amendedRow(field: string): string | null {
  const f = field.toLowerCase()
  for (const [row, keys] of Object.entries(FIELD_KEYS)) if (keys.some((k) => f.includes(k))) return row
  return null
}

const PENDING = '— (in flight)'

export function diffRows(bet: BetRecord): DiffRow[] {
  const c = committedFields(bet)
  const resolved = bet.status === 'resolved'
  const amends = bet.amendments ?? []
  const touched = new Map<string, Amendment[]>()
  for (const a of amends) {
    const row = amendedRow(a.field)
    if (row) touched.set(row, [...(touched.get(row) ?? []), a])
  }
  const amendedText = (row: string) => touched.get(row)!.map((a) => a.change).join('; ')
  const base = (row: string, reported: string, mark: Mark = 'held'): [string, Mark] =>
    touched.has(row) ? [resolved ? `${reported} · amended: ${amendedText(row)}` : amendedText(row), 'amended'] : [resolved ? reported : PENDING, resolved ? mark : 'pending']

  const rows: DiffRow[] = []
  const push = (label: string, planned: string, [reported, mark]: [string, Mark]) => rows.push({ label, planned, reported, mark })

  push('wager', wagerSentence({ ...bet, ...c } as BetRecord), base('wager', bet.actuals || '—'))
  push('fold-if', c.foldIf, base('fold-if', `${bet.outcome ?? '—'} → ${bet.call || '—'}`, bet.deviation ? 'deviated' : 'held'))
  for (const k of ['win', 'inconclusive', 'loss'] as const) {
    const fired = resolved && bet.outcome === k
    push(k === 'inconclusive' ? 'incon.' : k, c.criteria[k], resolved
      ? [fired ? `fired → ${bet.call || '—'}` : 'did not fire', fired && bet.deviation ? 'deviated' : 'held']
      : [PENDING, 'pending'])
  }
  if (c.confidence) push('confidence', c.confidence, base('confidence', bet.outcome === 'win' ? '1 (won)' : `0 (${bet.outcome ?? '—'})`))
  const rung = c.instrument ? `${rungLine(c.instrument.type)}${c.instrument.spec ? ` · ${specLine(c.instrument.spec)}` : ''}` : 'rung not declared'
  push('rung', rung, touched.has('rung') ? [amendedText('rung'), 'amended'] : [resolved ? 'as locked' : PENDING, resolved ? 'held' : 'pending'])
  if (c.expectation) push('expectation', c.expectation, base('expectation', bet.actuals || '—'))
  // evidence arrives after the lock — nothing planned to hold it against, so it is never a deviation
  if (bet.evidence?.length) rows.push({ label: 'evidence', planned: '— (after the lock)', reported: bet.evidence.map((e) => `${e.ts.slice(0, 10)} ${e.summary}`).join('\n'), mark: 'held' })
  if (bet.deviation) rows.push({ label: 'deviation', planned: '—', reported: bet.deviation, mark: 'deviated' })
  for (const a of amends) rows.push({ label: `amend · ${a.ts.slice(0, 10)}`, planned: `(as locked) ${a.field}`, reported: `${a.change} — “${a.reason}”`, mark: 'amended' })
  return rows
}

// ── plain text, ≤ 80 columns ─────────────────────────────────────────
const W = [10, 29, 27, 8] as const
const GUTTER = '  '
export const TEXT_WIDTH = W.reduce((a, b) => a + b, 0) + GUTTER.length * (W.length - 1) // 80

export function wrap(s: string, width: number): string[] {
  const out: string[] = []
  for (const para of s.split('\n')) {
    let line = ''
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (word.length > width) {
        if (line) { out.push(line); line = '' }
        out.push(word.slice(0, width)); word = word.slice(width)
      }
      if (!line) line = word
      else if (line.length + 1 + word.length <= width) line += ' ' + word
      else { out.push(line); line = word }
    }
    out.push(line)
  }
  return out.length ? out : ['']
}

const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length))

function textRow(cells: string[]): string[] {
  const cols = cells.map((c, i) => wrap(c, W[i]))
  const h = Math.max(...cols.map((c) => c.length))
  const lines: string[] = []
  for (let i = 0; i < h; i++) lines.push(cols.map((c, j) => pad(c[i] ?? '', W[j])).join(GUTTER).replace(/\s+$/, ''))
  return lines
}

export function diffText(bet: BetRecord, tag = 'bet'): string {
  const lines: string[] = []
  lines.push(...wrap(`${tag} · ${bet.change}`, TEXT_WIDTH))
  const when = bet.lockedAt ? ` locked ${bet.lockedAt.slice(0, 10)}` : ''
  const seal = bet.seal ? ` · sha256 ${bet.seal.slice(0, 8)}…` : ''
  lines.push(`the diff —${when}${seal}`.slice(0, TEXT_WIDTH))
  lines.push('='.repeat(TEXT_WIDTH))
  lines.push(...textRow(['', 'as planned', 'as reported', '']))
  lines.push('-'.repeat(TEXT_WIDTH))
  for (const r of diffRows(bet)) {
    lines.push(...textRow([r.label, r.planned, r.reported, r.mark]))
  }
  lines.push('-'.repeat(TEXT_WIDTH))
  lines.push('alphabeta.tools · read-only projection of the sealed record')
  return lines.join('\n')
}
