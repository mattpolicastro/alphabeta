import { useEffect, useRef, useState } from 'react'
import { Thread, type ThreadMsg } from './Thread'
import { StatusChip, surfaceClass } from './StatusChip'

export type { ThreadMsg }

const FACILITATORS = ['claude', 'qwen3.8:27b']

export function Dock({
  thread,
  onSend,
  relayUp,
}: {
  thread: ThreadMsg[]
  onSend: (t: string) => void
  relayUp: boolean
}) {
  const [draft, setDraft] = useState('')
  const [facilitator, setFacilitator] = useState('claude')
  useEffect(() => {
    fetch('/api/facilitator').then((r) => r.json()).then((j) => setFacilitator(j.model)).catch(() => {})
  }, [])
  const cycleFacilitator = () => {
    const next = FACILITATORS[(FACILITATORS.indexOf(facilitator) + 1) % FACILITATORS.length]
    fetch('/api/facilitator', { method: 'PUT', body: JSON.stringify({ model: next }) })
      .then((r) => r.json()).then((j) => setFacilitator(j.model)).catch(() => {})
  }
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const awaiting = thread.length > 0 && thread[thread.length - 1].role === 'you'

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread, awaiting])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    onSend(text)
  }

  return (
    <div className={`dock ${expanded ? 'expanded' : ''} ${surfaceClass('tray-openfield')}`}>
      {thread.length > 0 && (
        <div className="dock-thread" ref={scrollRef}>
          <Thread msgs={thread} awaiting={awaiting} />
        </div>
      )}
      <div className="dock-row">
        <span
          className={`relay-dot ${relayUp ? 'up' : 'down'}`}
          title={relayUp ? 'relay live' : 'relay unreachable'}
        />
        <span className="dock-eyebrow">open field</span>
        <StatusChip id="tray-openfield" />
        <button className="fac-toggle" title="switch facilitator" onClick={cycleFacilitator}>
          ⇄ {facilitator === 'claude' ? 'claude' : facilitator.split(':')[0]}
        </button>
        <textarea
          rows={1}
          placeholder={thread.length === 0 ? 'say what you’re thinking…' : 'keep going…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
            e.stopPropagation()
          }}
        />
        {thread.length > 0 && (
          <button className="dock-toggle" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '⌄ collapse' : '⌃ expand'}
          </button>
        )}
      </div>
    </div>
  )
}
