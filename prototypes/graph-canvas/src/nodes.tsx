import { Handle, Position } from '@xyflow/react'
import type { BetRecord, Gate, StratRecord } from './model'

export function StratNode({ data, selected }: any) {
  const s = data.strat as StratRecord
  const TAG: Record<string, string> = { goal: 'G', problem: 'P', solution: 'S', question: 'Q' }
  return (
    <div className={`node strat strat-${s.kind} ${s.answered ? 'answered' : ''} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={data.orient === 'h' ? Position.Left : Position.Top} />
      <div className="node-eyebrow">
        {data.seq ? `${TAG[s.kind] ?? '?'}${data.seq} · ` : ''}
        {s.kind}
        {s.answered && <span className="answered-chip">✓ answered</span>}
      </div>
      <div className="node-title">{s.title}</div>
      {s.takeaway && <div className="takeaway">→ {s.takeaway}</div>}
      {/* the discipline choice — spend a test, or answer it with a lookup.
          Equal weight on purpose: neither is the recommended one. */}
      {s.kind === 'solution' && (data.onElevate || data.onAsk) && (
        <div className="solution-acts">
          {data.onElevate && (
            <button className="act" title="mint a draft bet that tests this solution"
              onClick={(e) => { e.stopPropagation(); data.onElevate() }}>
              place a bet
            </button>
          )}
          {data.onAsk && (
            <button className="act" title="mint a question under the same problem"
              onClick={(e) => { e.stopPropagation(); data.onAsk() }}>
              ask a question
            </button>
          )}
        </div>
      )}
      <Handle type="source" position={data.orient === 'h' ? Position.Right : Position.Bottom} />
    </div>
  )
}

const OUTCOME_LABEL: Record<string, string> = {
  win: 'WIN',
  loss: 'LOSS',
  inconclusive: 'INCONCL.',
}

export function BetNode({ data, selected }: any) {
  const b = data.bet as BetRecord
  const gate = (data.gate ?? 'open') as Gate
  // the seal mark: locked is the one state the record can no longer be edited in
  const statusLabel =
    b.status === 'resolved'
      ? OUTCOME_LABEL[b.outcome ?? 'inconclusive']
      : b.status === 'locked'
        ? '◆ LOCKED'
        : b.status.toUpperCase()
  const statusClass = b.status === 'resolved' ? `s-${b.outcome}` : `s-${b.status}`
  const resolvable = b.status === 'locked' || b.status === 'running'

  return (
    <div className={`node bet ${statusClass} g-${gate} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={data.orient === 'h' ? Position.Left : Position.Top} />
      <div className="bet-head">
        {data.seq && <span className="pill tag">B{data.seq}</span>}
        <span className={`pill ${statusClass}`}>{statusLabel}</span>
        {gate !== 'open' && <span className={`pill gate-${gate}`}>{gate.toUpperCase()}</span>}
        <span className="surface">{b.surface}</span>
      </div>
      <div className="node-title">{b.change}</div>
      <div className="bet-metric">
        {b.direction === 'lift' ? '↑' : '↓'} {b.metric} · {b.magnitude}
      </div>
      <div className="fold-if">fold if: {b.foldIf}</div>
      {b.deviation && <div className="deviation-flag">⚠ deviation logged</div>}
      {resolvable && data.onResolve && (
        <div className="resolve-row">
          <span>resolve:</span>
          <button className="r-win" onClick={(e) => { e.stopPropagation(); data.onResolve('win') }}>W</button>
          <button className="r-inc" onClick={(e) => { e.stopPropagation(); data.onResolve('inconclusive') }}>I</button>
          <button className="r-loss" onClick={(e) => { e.stopPropagation(); data.onResolve('loss') }}>L</button>
        </div>
      )}
      <Handle type="source" position={data.orient === 'h' ? Position.Right : Position.Bottom} />
    </div>
  )
}
