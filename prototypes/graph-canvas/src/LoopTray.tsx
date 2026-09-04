import { useState } from 'react'
import { LOOP, stepStatus, type LoopStepId } from './loop'
import { StatusChip } from './StatusChip'

export function LoopTray({
  onClose, onTry,
}: {
  onClose: () => void
  // returns a note when there is nothing to open (e.g. no draft bet yet)
  onTry: (id: LoopStepId) => string | void
}) {
  const [notes, setNotes] = useState<Partial<Record<LoopStepId, string>>>({})
  return (
    <aside className="tray loop">
      <div className="panel-head">
        <span className="panel-eyebrow">how it works</span>
        <button className="close" onClick={onClose}>×</button>
      </div>
      <h2 className="loop-title">One loop, five moments.</h2>
      {LOOP.map((s, i) => {
        const { status, gap } = stepStatus(s)
        const notYet = status === 'planned'
        return (
          <div key={s.id} className={`loopstep ${notYet ? 'st-planned' : ''}`}>
            <span className="loop-n">{i + 1}</span>
            <span className="loop-name">{s.name} <StatusChip status={status} gap={gap} /></span>
            <span className="loop-line">{s.line}</span>
            <span className="loop-try">
              {notYet ? (
                <span className="capchip">not yet</span>
              ) : (
                <button className="btn2 sm" onClick={() => { const n = onTry(s.id); setNotes((m) => ({ ...m, [s.id]: n || undefined })) }}>try it →</button>
              )}
              {notes[s.id] && <span className="loop-note">{notes[s.id]}</span>}
            </span>
          </div>
        )
      })}
      <a className="loop-all" href="https://alphabeta.tools/capabilities/" target="_blank" rel="noreferrer">everything, with status → /capabilities</a>
    </aside>
  )
}
