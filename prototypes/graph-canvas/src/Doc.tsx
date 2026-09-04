// Documents: read-only projections, opened in context — never routes. One component
// per document (src/{Diff,Calibration,Graveyard}.tsx), each in the shared shell
// (src/Overlay.tsx); this only dispatches.
import type { Edge, Node } from '@xyflow/react'
import type { BetRecord } from './model'
import { DiffDoc } from './Diff'
import { CalibrationDoc } from './Calibration'
import { GraveyardDoc } from './Graveyard'
import { Overlay } from './Overlay'

export type DocReq = { kind: 'diff'; nodeId: string } | { kind: 'calibration' } | { kind: 'graveyard' }

export function DocOverlay({ req, nodes, edges, onClose, onOpen }: { req: DocReq; nodes: Node[]; edges: Edge[]; onClose: () => void; onOpen: (id: string) => void }) {
  if (req.kind === 'calibration') return <CalibrationDoc nodes={nodes} onClose={onClose} />
  if (req.kind === 'graveyard') return <GraveyardDoc nodes={nodes} edges={edges} onOpen={onOpen} onClose={onClose} />
  const n = nodes.find((x) => x.id === req.nodeId)
  const bet = (n?.data as any)?.bet as BetRecord | undefined
  if (!bet) return <Overlay kind="doc" eyebrow="the diff" onClose={onClose}><div className="locked-note">that bet is no longer on the board</div></Overlay>
  return <DiffDoc tag={`B${(n!.data as any).seq ?? '·'}`} bet={bet} onClose={onClose} />
}
