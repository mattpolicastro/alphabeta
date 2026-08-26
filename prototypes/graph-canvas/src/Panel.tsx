import type { Edge, Node } from '@xyflow/react'
import type { BetRecord, StratRecord } from './model'
import { wagerSentence } from './model'
import type { MomentKind } from './Moment'

interface Props {
  node: Node
  nodes: Node[]
  edges: Edge[]
  onClose: () => void
  onEdit: (id: string, patch: Partial<BetRecord>) => void
  onMoment: (kind: MomentKind, nodeId: string) => void
}

export function RecordPanel({ node, nodes, edges, onClose, onEdit, onMoment }: Props) {
  const bet = (node.data as any).bet as BetRecord | undefined
  const strat = (node.data as any).strat as StratRecord | undefined
  const seq = (node.data as any).seq
  const tag = seq ? (bet ? `B${seq}` : `${(strat?.kind ?? '?')[0].toUpperCase()}${seq}`) : ''

  return (
    <aside className="record-panel">
      <div className="panel-head">
        <span className="panel-eyebrow">{tag} · {bet ? `bet — ${bet.status}` : strat?.kind}</span>
        <button className="close" onClick={onClose}>×</button>
      </div>
      {strat && <StratFace id={node.id} strat={strat} nodes={nodes} edges={edges} onMoment={onMoment} />}
      {bet && <BetFace id={node.id} bet={bet} onEdit={onEdit} onMoment={onMoment} />}
    </aside>
  )
}

function StratFace({ id, strat, nodes, edges, onMoment }: { id: string; strat: StratRecord; nodes: Node[]; edges: Edge[]; onMoment: Props['onMoment'] }) {
  // rivals: sibling solutions under the same problem
  const rivals =
    strat.kind === 'solution'
      ? edges
          .filter((e) => e.target === id && (e.data as any)?.kind === 'lineage')
          .flatMap((pe) => edges.filter((e) => e.source === pe.source && e.target !== id && (e.data as any)?.kind === 'lineage'))
          .map((e) => nodes.find((n) => n.id === e.target))
          .filter((n) => n && (n.data as any)?.strat?.kind === 'solution')
      : []
  return (
    <>
      <h2>{strat.title}</h2>
      {strat.owner && <div className="dimlbl">owner: {strat.owner}</div>}
      {strat.kind === 'question' && (
        <dl>
          <dt>expectation (before looking)</dt>
          <dd>{strat.expectation ?? <span className="locked-note">not yet stated — the answer moment will ask</span>}</dd>
          {strat.answered && (<><dt>takeaway</dt><dd className="fold-if-dd">{strat.takeaway}</dd>
            {strat.validity && <><dt>validity</dt><dd>{strat.validity}</dd></>}</>)}
        </dl>
      )}
      {strat.detail && (<><div className="dimlbl">record</div><p className="detail">{strat.detail}</p></>)}
      {rivals.length > 0 && (
        <><div className="dimlbl">⚔ rivals under the same problem</div>
          <ul style={{ paddingLeft: 18, fontSize: 12 }}>{rivals.map((r) => <li key={r!.id}>{(r!.data as any).strat.title}</li>)}</ul></>
      )}
      {strat.kind === 'question' && !strat.answered && (
        <button className="btn2 pri" style={{ marginTop: 14 }} onClick={() => onMoment('answer', id)}>Answer…</button>
      )}
    </>
  )
}

function BetFace({ id, bet, onEdit, onMoment }: { id: string; bet: BetRecord; onEdit: Props['onEdit']; onMoment: Props['onMoment'] }) {
  const draft = bet.status === 'draft' || bet.status === 'ready'
  return (
    <>
      <h2>{wagerSentence(bet)}</h2>
      {draft ? (
        <>
          <div className="dimlbl">pencil register — draft, freely editable</div>
          <dl>
            {(['change', 'metric', 'magnitude', 'mechanism'] as const).map((f) => (
              <span key={f}><dt>{f}</dt><dd><input className="finput" value={(bet as any)[f]} onChange={(e) => onEdit(id, { [f]: e.target.value } as any)} /></dd></span>
            ))}
            <dt>fold-if (draft)</dt>
            <dd><input className="finput" value={bet.foldIf} onChange={(e) => onEdit(id, { foldIf: e.target.value })} /></dd>
          </dl>
          <button className="btn2 pri" style={{ marginTop: 14 }} onClick={() => onMoment('lock', id)}>Lock…</button>
        </>
      ) : (
        <>
          <div className="dimlbl">ink register — locked{bet.lockedAt ? ` ${bet.lockedAt.slice(0, 10)}` : ''}</div>
          <div className="lockbox2">
            <span className="seal">LOCKED{bet.lockedAt ? ` · ${bet.lockedAt.slice(0, 10)}` : ''}</span>
            <dl>
              <dt>mechanism</dt><dd>{bet.mechanism || '—'}</dd>
              <dt>fold-if</dt><dd className="fold-if-dd">{bet.foldIf}</dd>
              {bet.confidence && <><dt>confidence</dt><dd>{bet.confidence}</dd></>}
              {bet.guardrails && <><dt>guardrails</dt><dd>{bet.guardrails}</dd></>}
              <dt>pre-registered actions</dt>
              <dd><span className="crit">win</span> {bet.criteria.win}<br /><span className="crit">incon.</span> {bet.criteria.inconclusive}<br /><span className="crit">loss</span> {bet.criteria.loss}</dd>
            </dl>
          </div>
          {(bet.amendments?.length ?? 0) > 0 && (
            <><div className="dimlbl">amendments</div>
              {bet.amendments!.map((a, i) => (
                <div className="amend-row" key={i}><span className="k">{a.ts.slice(5, 10)}</span> {a.field}: {a.change} — “{a.reason}”</div>
              ))}</>
          )}
          {bet.status === 'resolved' ? (
            <dl>
              <dt>actuals</dt><dd>{bet.actuals || '—'}</dd>
              <dt>call</dt><dd>{bet.call || '—'}</dd>
              {bet.deviation && <><dt>deviation</dt><dd className="deviation">{bet.deviation}</dd></>}
              {bet.learning && <><dt>learning</dt><dd>{bet.learning}</dd></>}
            </dl>
          ) : (
            <div style={{ marginTop: 14 }}>
              <button className="btn2 pri" onClick={() => onMoment('resolve', id)}>Resolve…</button>
              <button className="btn2" onClick={() => onMoment('amend', id)}>Amend…</button>
            </div>
          )}
        </>
      )}
      <p className="margin-note">{draft ? 'content is yours until the lock; then it is history' : 'the lock is structural, not polite'}</p>
    </>
  )
}
