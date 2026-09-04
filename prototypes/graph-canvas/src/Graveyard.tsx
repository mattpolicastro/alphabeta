// The Graveyard — what died and what it cost. Read-only, pencil register while stub.
import type { Edge, Node } from '@xyflow/react'
import { graveyardOf, type GraveEntry } from './graveyard-entries'
import { StatusChip } from './StatusChip'

const SECTIONS: { kind: GraveEntry['kind']; title: string; empty: string }[] = [
  { kind: 'problem', title: 'detonated problems', empty: 'none — no problem has been refuted' },
  { kind: 'question', title: 'mooted questions', empty: 'none' },
  { kind: 'bet', title: 'bets lost or never run', empty: 'none' },
]

export function GraveyardDoc({ nodes, edges, onOpen }: { nodes: Node[]; edges: Edge[]; onOpen: (id: string) => void }) {
  const entries = graveyardOf(nodes, edges)
  return (
    <>
      <div className="doc-head">
        <span className="panel-eyebrow">the graveyard</span>
        <StatusChip id="doc-graveyard" />
        <span className="mono-line doc-meta">{entries.length} buried</span>
      </div>
      <h3>What died, priced.</h3>
      {SECTIONS.map((s) => {
        const rows = entries.filter((e) => e.kind === s.kind)
        return (
          <div key={s.kind}>
            <div className="dimlbl">{s.title}</div>
            {rows.length === 0 && <div className="docket-empty">{s.empty}</div>}
            {rows.map((e) => (
              <div className="docket-row grave-row" key={e.id} onClick={() => onOpen(e.id)}>
                <span className="mono dtag">{e.tag}</span>
                <span className="dtitle">{e.title}<span className="dsub grave-fate">{e.fate}</span></span>
                <span className="mono dright">{e.cost}</span>
              </div>
            ))}
          </div>
        )
      })}
      <p className="margin-note">a loss that was called early cost less than one that ran to maturation; a pruned bet cost nothing — that is the point of the gate.</p>
    </>
  )
}
