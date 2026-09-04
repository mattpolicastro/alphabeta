// The docket: a due-list of obligations by urgency (default), the gantt behind a
// timeline toggle. The due-list is src/docket-items.ts; every row carries the one
// action that discharges it. Overdue rows sit in --incon; nothing here is accent.
import { useState } from 'react'
import type { Edge, Node } from '@xyflow/react'
import { deriveGates, type BetRecord, type StratRecord } from './model'
import type { MomentKind } from './Moment'
import { StatusChip } from './StatusChip'
import { DAY, DEFAULT_MATURATION_DAYS, findContentions, maturationOf, type Maturation } from './contentions'
import { URGENCIES, URGENCY_EMPTY, URGENCY_LABEL, countBy, dueItems, tagOf, type DueItem } from './docket-items'

const RUNTIME_DAYS = DEFAULT_MATURATION_DAYS

const bet = (n: Node) => (n.data as any).bet as BetRecord
const strat = (n: Node) => (n.data as any).strat as StratRecord
const tag = tagOf

const ACTION_LABEL: Record<DueItem['action'], string> = {
  resolve: 'resolve…', answer: 'answer…', amend: 'amend…', unblock: 'see blocker', lock: 'lock…', revisit: 'open',
}

export function DocketView({ nodes, edges, onOpen, onMoment }: {
  nodes: Node[]
  edges: Edge[]
  onOpen: (id: string) => void
  onMoment?: (kind: MomentKind, id: string) => void
}) {
  const [mode, setMode] = useState<'due' | 'timeline'>('due')
  const due = dueItems(nodes, edges)
  const summary = URGENCIES.map((u) => [countBy(due, u), URGENCY_LABEL[u]] as const).filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`).join(' · ')

  return (
    <div className="ledger-view">
      <div className="dimlbl">the docket — what is owed, by urgency<StatusChip id="docket" /></div>
      <div className="docket-head">
        <span className="sheet-meta">{summary || 'nothing owed'}</span>
        <span style={{ flex: 1 }} />
        <div className="segbtns">
          <button className={mode === 'due' ? 'on' : ''} onClick={() => setMode('due')}>due</button>
          <button className={mode === 'timeline' ? 'on' : ''} onClick={() => setMode('timeline')}>timeline</button>
        </div>
      </div>
      {mode === 'due'
        ? <DueList nodes={nodes} due={due} onOpen={onOpen} onMoment={onMoment} />
        : <Timeline nodes={nodes} edges={edges} onOpen={onOpen} />}
    </div>
  )
}

// ── the due-list ─────────────────────────────────────────────────────
function DueList({ nodes, due, onOpen, onMoment }: {
  nodes: Node[]
  due: DueItem[]
  onOpen: (id: string) => void
  onMoment?: (kind: MomentKind, id: string) => void
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const titleOf = (d: DueItem) => {
    const n = byId.get(d.nodeId)
    if (!n) return d.nodeId
    if (d.kind === 'contention') {
      const other = byId.get(d.id.split(':')[2])
      return <>{bet(n).change} <span className="locked-note">and</span> {other ? bet(other).change : '?'}</>
    }
    return n.type === 'bet' ? bet(n).change : strat(n).title
  }
  // the action does the thing: a moment where one exists, else selection
  const act = (d: DueItem) => {
    if (d.action === 'resolve' || d.action === 'answer' || d.action === 'lock' || d.action === 'amend') {
      if (onMoment) return onMoment(d.action, d.nodeId)
      return onOpen(d.nodeId)
    }
    if (d.action === 'unblock') return onOpen(d.blockedBy?.[0] ?? d.nodeId)
    return onOpen(d.nodeId)
  }
  return (
    <div className="due-list">
      {URGENCIES.map((u) => {
        const rows = due.filter((d) => d.urgency === u)
        return (
          <section key={u} className={`due-group u-${u}`}>
            <div className="due-group-head">{URGENCY_LABEL[u]}{rows.length > 0 && <span className="mono due-count">{rows.length}</span>}</div>
            {rows.length === 0 && <div className="due-empty">{URGENCY_EMPTY[u]}</div>}
            {rows.map((d) => (
              <div className={`docket-row due-row u-${d.urgency}`} key={d.id} onClick={() => onOpen(d.nodeId)}>
                <span className="mono dtag">{byId.has(d.nodeId) ? tag(byId.get(d.nodeId)!) : '·'}</span>
                <span className="dtitle">{titleOf(d)}<span className="mono due-reason">{d.reason}</span></span>
                <button className="btn2 sm due-act" onClick={(e) => { e.stopPropagation(); act(d) }}>{ACTION_LABEL[d.action]}</button>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

// ── the timeline (the original gantt, kept as the secondary view) ────
function Timeline({ nodes, edges, onOpen }: { nodes: Node[]; edges: Edge[]; onOpen: (id: string) => void }) {
  const gates = deriveGates(nodes, edges)
  const blockersOf = (id: string) =>
    edges.filter((e) => e.target === id && (e.data as any)?.kind === 'dependency')
      .map((e) => nodes.find((n) => n.id === e.source)).filter(Boolean) as Node[]

  const today = Date.now()
  interface Bar { n: Node; start: number; end: number; kind: 'live' | 'overdue' | 'ghost' | 'gated' | 'done'; note?: string; isDefault?: boolean }
  const bars: Bar[] = []
  // the maturation is read from the lock when it can be; the 14-day fallback says so
  const matNote = (m: Maturation) => (m.source === 'default' ? `${m.days}d default` : `${m.days}d ${m.source === 'declared' ? 'declared' : m.source === 'lab' ? 'from the lab' : 'from the spec'}`)

  for (const n of nodes.filter((x) => x.type === 'bet')) {
    const b = bet(n)
    const lock = b.lockedAt ? new Date(b.lockedAt).getTime() : null
    const m = maturationOf(b, today)
    if ((b.status === 'locked' || b.status === 'running') && lock) {
      const due = lock + m.days * DAY
      bars.push(today > due
        ? { n, start: lock, end: today, kind: 'overdue', note: `OVERDUE +${Math.floor((today - due) / DAY)}d · ${matNote(m)}`, isDefault: m.source === 'default' }
        : { n, start: lock, end: due, kind: 'live', note: matNote(m), isDefault: m.source === 'default' })
    } else if (b.status === 'locked' || b.status === 'running') {
      bars.push({ n, start: today, end: today + m.days * DAY, kind: 'live', note: `no lock date · ${matNote(m)}`, isDefault: m.source === 'default' })
    } else if (b.status === 'ready' || b.status === 'draft') {
      const g = gates.get(n.id)
      if (g && g !== 'open') {
        const blockers = blockersOf(n.id)
        bars.push({ n, start: today + RUNTIME_DAYS * DAY, end: today + 2 * RUNTIME_DAYS * DAY, kind: 'gated', note: 'waits on ' + blockers.map(tag).join(' AND ') })
      } else if (b.status === 'ready') {
        bars.push({ n, start: today, end: today + RUNTIME_DAYS * DAY, kind: 'ghost', note: 'ready — unlaunched' })
      }
    } else if (b.status === 'resolved' && lock) {
      const done = b.resolvedAt ? new Date(b.resolvedAt).getTime() : lock + m.days * DAY
      bars.push({ n, start: lock, end: Math.min(done, today), kind: 'done', note: b.outcome ?? undefined })
    }
  }
  bars.sort((a, b2) => a.start - b2.start)

  const t0 = Math.min(...bars.map((b) => b.start), today - 7 * DAY) - 2 * DAY
  const t1 = Math.max(...bars.map((b) => b.end), today + 21 * DAY) + 2 * DAY
  const pct = (t: number) => ((t - t0) / (t1 - t0)) * 100
  const weeks: number[] = []
  const firstWeek = new Date(t0); firstWeek.setHours(0, 0, 0, 0)
  for (let t = firstWeek.getTime(); t < t1; t += 7 * DAY) weeks.push(t)

  const contentions = findContentions(nodes, today)
  const mmdd = (t: number) => new Date(t).toISOString().slice(5, 10)

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
    <>
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
                  {it.b.note && <span className={`gnote ${it.b.isDefault ? 'default' : ''}`}>{it.b.note}</span>}
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

      <div className="dimlbl" style={{ marginTop: 26 }}>contentions — two bets on one surface, on the clock at once</div>
      {contentions.length === 0 && <div className="docket-empty">none — every live bet has its surface to itself</div>}
      {contentions.map((c) => (
        <div className="docket-row contention-row" key={`${c.a.id}-${c.b.id}`} onClick={() => onOpen(c.a.id)}>
          <span className="mono dtag">{tag(c.a)} × {tag(c.b)}</span>
          <span className="dtitle">{bet(c.a).change} <span className="locked-note">and</span> {bet(c.b).change}
            <span className="dsub">both read {c.surface} — neither can be read cleanly while the other runs</span></span>
          <span className="mono dright">overlap {mmdd(c.start)} → {mmdd(c.end)} · {Math.ceil((c.end - c.start) / DAY)}d</span>
        </div>
      ))}
    </>
  )
}
