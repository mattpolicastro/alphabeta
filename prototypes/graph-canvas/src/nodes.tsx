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
      {s.kind === 'solution' && data.onElevate && (
        <button
          className="elevate"
          title="Elevate to bet"
          onClick={(e) => {
            e.stopPropagation()
            data.onElevate()
          }}
        >
          ↗ elevate to bet
        </button>
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
  const statusLabel =
    b.status === 'resolved' ? OUTCOME_LABEL[b.outcome ?? 'inconclusive'] : b.status.toUpperCase()
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
