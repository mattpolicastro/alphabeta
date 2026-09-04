// Documents: read-only projections, opened in context — never routes. One overlay,
// one component per document (src/{Diff,Calibration,Graveyard}.tsx).
import type { Edge, Node } from '@xyflow/react'
import type { BetRecord } from './model'
import { surfaceClass } from './StatusChip'
import { DiffDoc } from './Diff'
import { CalibrationDoc } from './Calibration'
import { GraveyardDoc } from './Graveyard'

export type DocReq = { kind: 'diff'; nodeId: string } | { kind: 'calibration' } | { kind: 'graveyard' }

const CAP: Record<DocReq['kind'], string> = { diff: 'doc-diff', calibration: 'doc-calibration', graveyard: 'doc-graveyard' }

export function DocOverlay({ req, nodes, edges, onClose, onOpen }: { req: DocReq; nodes: Node[]; edges: Edge[]; onClose: () => void; onOpen: (id: string) => void }) {
  let body: React.ReactNode = null
  if (req.kind === 'diff') {
    const n = nodes.find((x) => x.id === req.nodeId)
    const bet = (n?.data as any)?.bet as BetRecord | undefined
    body = bet ? <DiffDoc tag={`B${(n!.data as any).seq ?? '·'}`} bet={bet} /> : <div className="locked-note">that bet is no longer on the board</div>
  } else if (req.kind === 'calibration') body = <CalibrationDoc nodes={nodes} />
  else body = <GraveyardDoc nodes={nodes} edges={edges} onOpen={onOpen} />
  return (
    <div className="moment-scrim" onClick={onClose}>
      <div className={`moment doc ${surfaceClass(CAP[req.kind])}`} onClick={(e) => e.stopPropagation()}>
        <button className="close doc-close" onClick={onClose}>×</button>
        {body}
      </div>
    </div>
  )
}
