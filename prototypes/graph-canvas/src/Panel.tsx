import type { Edge, Node } from '@xyflow/react'
import type { BetRecord, StratRecord } from './model'
import { wagerSentence } from './model'
import type { MomentKind } from './Moment'
import { StatusChip, surfaceClass } from './StatusChip'
import { Cockpit } from './Cockpit'
import { Admission } from './Admission'
import { specLine } from './funnel'

interface Props {
  node: Node
  nodes: Node[]
  edges: Edge[]
  onClose: () => void
  onEdit: (id: string, patch: Partial<BetRecord>) => void
  onEditStrat: (id: string, patch: Partial<StratRecord>) => void
  onMoment: (kind: MomentKind, nodeId: string) => void
  onDiff: (nodeId: string) => void
}

export function RecordPanel({ node, nodes, edges, onClose, onEdit, onEditStrat, onMoment, onDiff }: Props) {
  const bet = (node.data as any).bet as BetRecord | undefined
  const strat = (node.data as any).strat as StratRecord | undefined
  const seq = (node.data as any).seq
  const tag = seq ? (bet ? `B${seq}` : `${(strat?.kind ?? '?')[0].toUpperCase()}${seq}`) : ''
  const faceId = bet
    ? (bet.status === 'draft' || bet.status === 'ready' ? 'face-draft' : 'face-cockpit')
    : strat?.kind === 'question' ? 'face-question' : strat?.kind === 'solution' ? 'face-solution' : null

  return (
    <aside className={`record-panel ${faceId ? surfaceClass(faceId) : ''}`}>
      <div className="panel-head">
        <span><span className="panel-eyebrow">{tag} · {bet ? `bet — ${bet.status}` : strat?.kind}</span> {faceId && <StatusChip id={faceId} />}</span>
        <button className="close" onClick={onClose}>×</button>
      </div>
      {strat && <StratFace id={node.id} strat={strat} nodes={nodes} edges={edges} onMoment={onMoment} onEditStrat={onEditStrat} />}
      {bet && <BetFace id={node.id} bet={bet} onEdit={onEdit} onMoment={onMoment} onDiff={onDiff} />}
    </aside>
  )
}

function StratFace({ id, strat, nodes, edges, onMoment, onEditStrat }: { id: string; strat: StratRecord; nodes: Node[]; edges: Edge[]; onMoment: Props['onMoment']; onEditStrat: Props['onEditStrat'] }) {
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
      {strat.kind === 'solution' && (
        <Admission id={id} strat={strat} rivals={rivals.map((r) => (r!.data as any).strat.title as string)} onEdit={onEditStrat} />
      )}
      {strat.kind === 'question' && !strat.answered && (
        <button className="btn2 pri" style={{ marginTop: 14 }} onClick={() => onMoment('answer', id)}>Answer…</button>
      )}
    </>
  )
}

function BetFace({ id, bet, onEdit, onMoment, onDiff }: { id: string; bet: BetRecord; onEdit: Props['onEdit']; onMoment: Props['onMoment']; onDiff: Props['onDiff'] }) {
  const draft = bet.status === 'draft' || bet.status === 'ready'
  return (
    <>
      <h2>{wagerSentence(bet)}</h2>
      {draft ? (
        <>
          <div className="dimlbl">pencil register — draft, freely editable</div>
          {bet.origin && <div className="locked-note mono-line">{bet.origin}</div>}
          {typeof bet.instrument?.spec === 'object' && <div className="locked-note mono-line">{specLine(bet.instrument.spec)}</div>}
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
        <Cockpit id={id} bet={bet} onMoment={onMoment} onDiff={onDiff} />
      )}
      <p className="margin-note">{draft ? 'content is yours until the lock; then it is history' : 'the lock is structural, not polite'}</p>
    </>
  )
}
