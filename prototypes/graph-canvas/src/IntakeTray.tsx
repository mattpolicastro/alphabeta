// Intake tray: type, classify by cues, override, place. Pencil register throughout —
// nothing here is committed. The facilitator (dock) is the conversational version.
import { useState } from 'react'
import type { StratKind } from './model'
import { KIND_ORDER, classifyIntake, type Intake } from './intake'
import { StatusChip, surfaceClass } from './StatusChip'

export function IntakeTray({ onClose, onPlace }: { onClose: () => void; onPlace: (kind: StratKind, title: string) => void }) {
  const [text, setText] = useState('')
  const [read, setRead] = useState<Intake | null>(null)
  const [kind, setKind] = useState<StratKind | null>(null)
  const classify = () => {
    const r = classifyIntake(text)
    setRead(r)
    setKind(r.confidence > 0 ? r.kind : null)
  }
  const place = () => {
    if (!kind || !text.trim()) return
    onPlace(kind, text.trim())
    setText(''); setRead(null); setKind(null)
  }
  return (
    <aside className={`tray intake ${surfaceClass('tray-intake')}`}>
      <div className="panel-head">
        <span><span className="panel-eyebrow">intake</span> <StatusChip id="tray-intake" /></span>
        <button className="close" onClick={onClose}>×</button>
      </div>
      <h2 className="loop-title">Say it; the cues sort it.</h2>
      <textarea className="finput" rows={5} value={text} onChange={(e) => { setText(e.target.value); setRead(null) }}
        placeholder="a goal, a gap, something to look up, or a change you want to try…" autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); classify() } e.stopPropagation() }} />
      <div className="intake-actions">
        <button className="btn2 sm" disabled={!text.trim()} onClick={classify}>classify</button>
        <span className="loop-note">⌘↵ classifies · rules, not a model</span>
      </div>
      {read && (
        <div className="intake-read">
          <div className="dimlbl">read as</div>
          <div className="segbtns">
            {KIND_ORDER.map((k) => (
              <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>
            ))}
          </div>
          <div className="intake-why">
            {read.confidence > 0 ? `${read.kind} · ${Math.round(read.confidence * 100)}% — ` : ''}{read.why.join(', ')}
            {kind && kind !== read.kind && ' · overridden'}
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn2 pri" disabled={!kind || !text.trim()} onClick={place}>place on canvas</button>
            <span className="loop-note">lands as a draft {kind ?? '…'} — pencil until you say otherwise</span>
          </div>
        </div>
      )}
    </aside>
  )
}
