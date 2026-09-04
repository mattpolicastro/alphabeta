import { useState } from 'react'
import type { Node } from '@xyflow/react'
import type { BetRecord, BetStatus } from './model'
import type { MomentKind } from './Moment'
import { StatusChip } from './StatusChip'

const COLS: { id: BetStatus; title: string }[] = [
  { id: 'draft', title: 'draft' },
  { id: 'ready', title: 'ready' },
  { id: 'locked', title: 'locked' },
  { id: 'running', title: 'running' },
  { id: 'resolved', title: 'resolved' },
]

// legal transitions (grammar L1); lock/resolve route through their ceremonies
const FREE: Record<string, BetStatus[]> = {
  draft: ['ready'],
  ready: ['draft'],
  locked: ['running'],
  running: [],
  resolved: [],
}
const CEREMONY: Record<string, Partial<Record<BetStatus, MomentKind>>> = {
  draft: { locked: 'lock' },
  ready: { locked: 'lock' },
  locked: { resolved: 'resolve' },
  running: { resolved: 'resolve' },
}

export function LedgerView({
  nodes, onOpen, onMoment, onStatus,
}: {
  nodes: Node[]
  onOpen: (id: string) => void
  onMoment: (kind: MomentKind, id: string) => void
  onStatus: (id: string, status: BetStatus) => void
}) {
  const [mode, setMode] = useState<'table' | 'kanban'>('table')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const bets = nodes.filter((n) => n.type === 'bet')

  const drop = (col: BetStatus) => {
    setOverCol(null)
    if (!dragId) return
    const b = (bets.find((n) => n.id === dragId)?.data as any)?.bet as BetRecord
    if (!b || b.status === col) return
    if (FREE[b.status]?.includes(col)) onStatus(dragId, col)
    else if (CEREMONY[b.status]?.[col]) onMoment(CEREMONY[b.status]![col]!, dragId)
    // anything else: refused silently — the lifecycle only runs forward
    setDragId(null)
  }

  return (
    <div className="ledger-view">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div className="dimlbl" style={{ flex: 1 }}>the ledger — every bet, no exceptions ({bets.length})<StatusChip id="ledger" /></div>
        <div className="segbtns">
          <button className={mode === 'table' ? 'on' : ''} onClick={() => setMode('table')}>table</button>
          <button className={mode === 'kanban' ? 'on' : ''} onClick={() => setMode('kanban')}>kanban</button>
        </div>
      </div>

      {mode === 'table' ? (
        <table className="ledger-table">
          <thead><tr><th>tag</th><th>wager</th><th>status</th><th>fold-if</th><th>surface</th><th>call</th></tr></thead>
          <tbody>
            {bets.map((n) => {
              const b = (n.data as any).bet as BetRecord
              const status = b.status === 'resolved' ? (b.outcome ?? 'resolved') : b.status
              return (
                <tr key={n.id} onClick={() => onOpen(n.id)}>
                  <td className="mono">B{(n.data as any).seq ?? '·'}</td>
                  <td>{b.change}</td>
                  <td><span className={`pill s-${b.status === 'resolved' ? b.outcome : b.status}`}>{status}</span></td>
                  <td className="mono">{b.foldIf}</td>
                  <td className="mono">{b.surface || '—'}</td>
                  <td className="mono">{b.call ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <div className="kanban">
          {COLS.map((col) => {
            const items = bets.filter((n) => ((n.data as any).bet as BetRecord).status === col.id)
            return (
              <div key={col.id}
                className={`kcol ${overCol === col.id ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id) }}
                onDragLeave={() => setOverCol(null)}
                onDrop={() => drop(col.id)}>
                <div className="kcol-head">{col.title} <span className="mono" style={{ color: 'var(--fade)' }}>{items.length}</span></div>
                {items.map((n) => {
                  const b = (n.data as any).bet as BetRecord
                  return (
                    <div key={n.id} className={`kcard s-${b.status === 'resolved' ? b.outcome : b.status}`}
                      draggable onDragStart={() => setDragId(n.id)} onClick={() => onOpen(n.id)}>
                      <div className="kcard-head">
                        <span className="mono" style={{ fontWeight: 600 }}>B{(n.data as any).seq ?? '·'}</span>
                        {b.status === 'resolved' && <span className={`pill s-${b.outcome}`}>{b.outcome}</span>}
                      </div>
                      {b.change}
                      <div className="kcard-fold">fold if: {b.foldIf}</div>
                    </div>
                  )
                })}
                {items.length === 0 && <div className="kcol-empty">—</div>}
              </div>
            )
          })}
        </div>
      )}
      {mode === 'kanban' && (
        <p style={{ fontSize: 11.5, color: 'var(--fade)', marginTop: 10 }}>
          drag draft ⇄ ready freely · dropping on <b>locked</b> or <b>resolved</b> opens the ceremony — the lifecycle only runs forward
        </p>
      )}
    </div>
  )
}
