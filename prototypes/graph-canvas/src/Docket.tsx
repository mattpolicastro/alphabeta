import { useState } from 'react'
import type { Edge, Node } from '@xyflow/react'
import { deriveGates, type BetRecord, type StratRecord } from './model'
import { StatusChip } from './StatusChip'

const RUNTIME_DAYS = 14
const DAY = 86_400_000

export function DocketView({ nodes, edges, onOpen }: { nodes: Node[]; edges: Edge[]; onOpen: (id: string) => void }) {
  const gates = deriveGates(nodes, edges)
  const bet = (n: Node) => (n.data as any).bet as BetRecord
  const strat = (n: Node) => (n.data as any).strat as StratRecord
  const tag = (n: Node) => {
    const s = (n.data as any).seq
    return n.type === 'bet' ? `B${s ?? '·'}` : `${(strat(n)?.kind ?? '?')[0].toUpperCase()}${s ?? '·'}`
  }
  const blockersOf = (id: string) =>
    edges.filter((e) => e.target === id && (e.data as any)?.kind === 'dependency')
      .map((e) => nodes.find((n) => n.id === e.source)).filter(Boolean) as Node[]

  const today = Date.now()
  interface Bar { n: Node; start: number; end: number; kind: 'live' | 'overdue' | 'ghost' | 'gated' | 'done'; note?: string }
  const bars: Bar[] = []

  for (const n of nodes.filter((x) => x.type === 'bet')) {
    const b = bet(n)
    const lock = b.lockedAt ? new Date(b.lockedAt).getTime() : null
    if ((b.status === 'locked' || b.status === 'running') && lock) {
      const due = lock + RUNTIME_DAYS * DAY
      bars.push(today > due
        ? { n, start: lock, end: today, kind: 'overdue', note: `OVERDUE +${Math.floor((today - due) / DAY)}d` }
        : { n, start: lock, end: due, kind: 'live' })
    } else if (b.status === 'locked' || b.status === 'running') {
      bars.push({ n, start: today, end: today + RUNTIME_DAYS * DAY, kind: 'live', note: 'no lock date' })
    } else if (b.status === 'ready' || b.status === 'draft') {
      const g = gates.get(n.id)
      if (g && g !== 'open') {
        const blockers = blockersOf(n.id)
        bars.push({ n, start: today + RUNTIME_DAYS * DAY, end: today + 2 * RUNTIME_DAYS * DAY, kind: 'gated', note: 'waits on ' + blockers.map(tag).join(' AND ') })
      } else if (b.status === 'ready') {
        bars.push({ n, start: today, end: today + RUNTIME_DAYS * DAY, kind: 'ghost', note: 'ready — unlaunched' })
      }
    } else if (b.status === 'resolved' && lock) {
      bars.push({ n, start: lock, end: Math.min(lock + RUNTIME_DAYS * DAY, today), kind: 'done', note: b.outcome ?? undefined })
    }
  }
  bars.sort((a, b2) => a.start - b2.start)

  const t0 = Math.min(...bars.map((b) => b.start), today - 7 * DAY) - 2 * DAY
  const t1 = Math.max(...bars.map((b) => b.end), today + 21 * DAY) + 2 * DAY
  const pct = (t: number) => ((t - t0) / (t1 - t0)) * 100
  const weeks: number[] = []
  const firstWeek = new Date(t0); firstWeek.setHours(0, 0, 0, 0)
  for (let t = firstWeek.getTime(); t < t1; t += 7 * DAY) weeks.push(t)

  const openQs = nodes.filter((n) => n.type === 'strat' && strat(n).kind === 'question' && !strat(n).answered)

  // ── grouping + row geometry (for leader lines) ────────────────────
  const [grouping, setGrouping] = useState<'flat' | 'surface'>('flat')
  const HEAD_H = 24, GROUP_H = 26, ROW_H = 34
  type Item = { t: 'group'; label: string } | { t: 'bar'; b: Bar }
  const items: Item[] = []
  if (grouping === 'flat') {
    bars.forEach((b) => items.push({ t: 'bar', b }))
  } else {
    const bySurf = new Map<string, Bar[]>()
    bars.forEach((b) => {
      const s = bet(b.n).surface || '(no surface)'
      if (!bySurf.has(s)) bySurf.set(s, [])
      bySurf.get(s)!.push(b)
    })
    for (const [s, bs] of [...bySurf.entries()].sort((a, z) => a[0].localeCompare(z[0]))) {
      items.push({ t: 'group', label: s })
      bs.forEach((b) => items.push({ t: 'bar', b }))
    }
  }
  const yOf = new Map<string, number>()
  let yAcc = HEAD_H
  for (const it of items) {
    if (it.t === 'group') yAcc += GROUP_H
    else { yOf.set(it.b.n.id, yAcc + ROW_H / 2); yAcc += ROW_H }
  }
  const totalH = yAcc
  const barById = new Map(bars.map((b) => [b.n.id, b]))
  const leaders = edges
    .filter((e) => (e.data as any)?.kind === 'dependency')
    .map((e) => ({ src: barById.get(e.source), tgt: barById.get(e.target) }))
    .filter((l) => l.src && l.tgt) as { src: Bar; tgt: Bar }[]

  return (
    <div className="ledger-view">
      <div className="dimlbl">the docket — obligations on the clock<StatusChip id="docket" /></div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, maxWidth: 900 }}>
        <span style={{ flex: 1 }} />
        <div className="segbtns">
          <button className={grouping === 'flat' ? 'on' : ''} onClick={() => setGrouping('flat')}>flat</button>
          <button className={grouping === 'surface' ? 'on' : ''} onClick={() => setGrouping('surface')}>by surface</button>
        </div>
      </div>
      <div className="gantt" style={{ position: 'relative' }}>
        <div className="grow ghead">
          <div className="glabel"></div>
          <div className="gtrack" style={{ border: 'none' }}>
            {weeks.map((w) => (
              <span key={w} className="gtick-label" style={{ left: `${pct(w)}%` }}>
                {new Date(w).toISOString().slice(5, 10)}
              </span>
            ))}
          </div>
        </div>
        {bars.length === 0 && <div className="docket-empty" style={{ padding: '0 12px' }}>no bets on the clock — lock something</div>}
        {items.map((it, idx) =>
          it.t === 'group' ? (
            <div className="ggroup" key={`g${idx}`}>{it.label}</div>
          ) : (
            <div className="grow" key={it.b.n.id} onClick={() => onOpen(it.b.n.id)}>
              <div className="glabel">
                <span className="mono dtag">{tag(it.b.n)}</span>
                <span className="gtitle">{bet(it.b.n).change}</span>
              </div>
              <div className="gtrack">
                {weeks.map((w) => <span key={w} className="gtick" style={{ left: `${pct(w)}%` }} />)}
                <span className="gtoday" style={{ left: `${pct(today)}%` }} />
                <span className={`gbar ${it.b.kind}`} style={{ left: `${pct(it.b.start)}%`, width: `${Math.max(pct(it.b.end) - pct(it.b.start), 1.2)}%` }}>
                  {it.b.note && <span className="gnote">{it.b.note}</span>}
                </span>
              </div>
            </div>
          ),
        )}
        {/* leader lines: blocker end → dependent start */}
        <svg className="gleaders" viewBox={`0 0 100 ${totalH}`} preserveAspectRatio="none" style={{ height: totalH }}>
          {leaders.map((l, i2) => {
            const sy = yOf.get(l.src.n.id)!, ty = yOf.get(l.tgt.n.id)!
            const sx = pct(l.src.end), tx = pct(l.tgt.start)
            const mx = Math.min(sx + 1.5, (sx + tx) / 2)
            return (
              <path key={i2} d={`M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ty} L ${tx} ${ty}`} 
                vectorEffect="non-scaling-stroke" className="gleader" />
            )
          })}
        </svg>
      </div>

      <div className="dimlbl" style={{ marginTop: 26 }}>off the clock — open questions (no dates, still owed)</div>
      {openQs.length === 0 && <div className="docket-empty">no open questions</div>}
      {openQs.map((n) => (
        <div className="docket-row" key={n.id} onClick={() => onOpen(n.id)}>
          <span className="mono dtag">{tag(n)}</span>
          <span className="dtitle">{strat(n).title}
            {!strat(n).expectation && <span className="dsub">expectation not yet stated</span>}</span>
          <span className="mono dright">{strat(n).owner ? `owner: ${strat(n).owner}` : 'unowned'}</span>
        </div>
      ))}
    </div>
  )
}
