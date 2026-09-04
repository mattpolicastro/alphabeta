// The Diff — as-planned against as-reported, one bet. Read-only projection; the
// share artifact. Rows come from src/diff-rows.ts; the text form is what "copy" carries.
import { useState } from 'react'
import type { BetRecord } from './model'
import { diffRows, diffText } from './diff-rows'
import { StatusChip } from './StatusChip'
import { Overlay } from './Overlay'

export function DiffDoc({ tag, bet, onClose }: { tag: string; bet: BetRecord; onClose: () => void }) {
  const rows = diffRows(bet)
  const text = diffText(bet, tag)
  const [showText, setShowText] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setNote('copied') } catch { setShowText(true); setNote('clipboard unavailable — select the text below') }
    setTimeout(() => setNote(null), 2400)
  }
  const meta = [bet.status === 'resolved' ? `resolved ${bet.outcome ?? ''}` : bet.status, bet.lockedAt && `locked ${bet.lockedAt.slice(0, 10)}`, bet.seal && `sha256 ${bet.seal.slice(0, 8)}…`].filter(Boolean).join(' · ')
  return (
    <Overlay kind="doc" eyebrow={`${tag} · the diff`} chip={<StatusChip id="doc-diff" />} meta={meta} title={bet.change} onClose={onClose}>
      <table className="diff">
        <thead><tr><th /><th>as planned</th><th>as reported</th><th /></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.label}-${i}`}>
              <td className="lbl">{r.label}</td>
              <td className="planned">{r.planned}</td>
              <td className="reported">{r.reported}</td>
              <td className={`mark m-${r.mark}`}>{r.mark}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-actions">
        <button className="btn2 sm" onClick={copy}>copy as text</button>
        <button className="btn2 sm" onClick={() => setShowText((v) => !v)}>{showText ? 'hide text' : 'show text'}</button>
        {note && <span className="loop-note">{note}</span>}
      </div>
      {showText && <pre className="doc-pre">{text}</pre>}
      <p className="margin-note">the left column is what was sealed; the right is what happened. nothing here edits either.</p>
    </Overlay>
  )
}
