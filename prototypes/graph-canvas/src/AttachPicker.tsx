// The attach overlay: a lab result has landed (/bet/attach?from=…, src/attach.ts)
// and needs a bet to be evidence for. The summary sits on top in mono; below it, the
// bets that can take evidence — locked and running first, resolved after as post-hoc,
// pre-lock bets counted out with the reason. Evidence is not a commitment: nothing
// here carries the accent. Shell from src/Overlay.tsx (kind document).
import type { Node } from '@xyflow/react'
import { attachCandidates, type AttachParsed, type Candidate } from './attach'
import { Overlay } from './Overlay'
import { StatusChip } from './StatusChip'

export function AttachOverlay({ parsed, nodes, onPick, onSeed, onClose }: {
  parsed: AttachParsed
  nodes: Node[]
  onPick: (id: string) => void
  onSeed: () => void
  onClose: () => void
}) {
  const c = attachCandidates(nodes)
  const none = !c.open.length && !c.resolved.length
  const meta = [`v${parsed.v}`, parsed.seal ? `sealed ${parsed.seal.slice(0, 8)}…` : 'unsealed'].join(' · ')
  return (
    <Overlay kind="doc" className="attach" eyebrow={`attach to a bet · from /lab/${parsed.tool}`} chip={<StatusChip id="funnel-attach-evidence" />} meta={meta}
      title="Which bet is this evidence for?" onClose={onClose}>
      <div className="attach-summary mono-line">{parsed.summary}</div>
      <div className="locked-note mono-line" style={{ marginTop: 4 }}>?{parsed.canonical}</div>

      {none ? (
        <div className="attach-empty">
          <div>no bet on this board can take evidence — evidence attaches after the lock, and nothing here is locked.</div>
          {nodes.length === 0
            ? <button className="btn2 sm" style={{ marginTop: 10 }} onClick={onSeed}>seed the demo board</button>
            : c.preLock > 0 && <div className="locked-note" style={{ marginTop: 6 }}>{c.preLock} pre-lock {c.preLock === 1 ? 'bet' : 'bets'} on the board — lock one first, then attach.</div>}
        </div>
      ) : (
        <>
          {c.open.length > 0 && <div className="dimlbl">in flight</div>}
          {c.open.map((x) => <Row key={x.id} c={x} onPick={onPick} />)}
          {c.resolved.length > 0 && <div className="dimlbl">resolved — attaching as post-hoc evidence</div>}
          {c.resolved.map((x) => <Row key={x.id} c={x} onPick={onPick} postHoc />)}
          {c.preLock > 0 && <div className="locked-note" style={{ marginTop: 10 }}>{c.preLock} pre-lock {c.preLock === 1 ? 'bet' : 'bets'} not listed — evidence attaches after the lock.</div>}
        </>
      )}
      <div className="doc-actions">
        <button className="btn2 sm" onClick={onClose}>cancel — don't attach</button>
      </div>
      <p className="margin-note">the result was recomputed here from the inputs in the URL; the seal, if any, is checked against the app's own hash of the canonical string.</p>
    </Overlay>
  )
}

function Row({ c, onPick, postHoc }: { c: Candidate; onPick: (id: string) => void; postHoc?: boolean }) {
  const b = c.bet
  const state = b.status === 'resolved' ? `resolved ${b.outcome ?? ''}`.trim() : b.status
  return (
    <button className="attach-row" onClick={() => onPick(c.id)}>
      <span className="attach-tag">{c.tag}</span>
      <span className="attach-change">{b.change}</span>
      <span className="attach-meta">{state}{b.lockedAt ? ` · locked ${b.lockedAt.slice(0, 10)}` : ''}{postHoc ? ' · post-hoc' : ''}</span>
    </button>
  )
}
