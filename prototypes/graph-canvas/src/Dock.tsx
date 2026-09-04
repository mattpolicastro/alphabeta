import { useEffect, useRef, useState } from 'react'
import { Thread, type ThreadMsg } from './Thread'
import { StatusChip, surfaceClass } from './StatusChip'
import { PRIVACY_LINE, STATIC, clearKey, loadKey, saveKey } from './llm'

export type { ThreadMsg }

const FACILITATORS = ['claude', 'qwen3.8:27b']

export function Dock({
  thread,
  onSend,
  relayUp,
  error,
  scopeHint,
}: {
  thread: ThreadMsg[]
  onSend: (t: string) => void
  relayUp: boolean
  error?: string | null
  scopeHint?: string // what the facilitator sees (src/llm.ts scopeLine)
}) {
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const awaiting = thread.length > 0 && thread[thread.length - 1].role === 'you'

  // static build: bring your own key. Read once, written on blur; never rendered unmasked.
  const [hasKey, setHasKey] = useState(() => STATIC && !!loadKey())
  const [keyDraft, setKeyDraft] = useState('')
  const commitKey = () => {
    if (!keyDraft.trim()) return
    saveKey(keyDraft); setKeyDraft(''); setHasKey(true)
  }
  const forgetKey = () => { clearKey(); setHasKey(false) }

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

  const live = STATIC ? hasKey : true
  return (
    <div className={`dock ${expanded ? 'expanded' : ''} ${surfaceClass('tray-openfield')} ${live ? '' : 'is-stub'}`}>
      {thread.length > 0 && (
        <div className="dock-thread" ref={scrollRef}>
          <Thread msgs={thread} awaiting={awaiting} />
        </div>
      )}
      <div className="dock-row">
        {STATIC ? (
          <span className={`relay-dot ${hasKey ? 'up' : 'down'}`} title={hasKey ? 'direct to api.anthropic.com with your key' : 'no key'} />
        ) : (
          <span className={`relay-dot ${relayUp ? 'up' : 'down'}`} title={relayUp ? 'relay live' : 'relay unreachable'} />
        )}
        <span className="dock-eyebrow">open field</span>
        <StatusChip id="tray-openfield" />
        {!STATIC && <FacilitatorToggle />}
        {scopeHint && live && <span className="dock-scope">{scopeHint}</span>}
        {STATIC && !hasKey ? (
          <>
            <input className="finput key-field" type="password" autoComplete="off" spellCheck={false}
              placeholder="paste an Anthropic API key to talk" value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitKey() } e.stopPropagation() }} />
            <button className="dock-keybtn" disabled={!keyDraft.trim()} onClick={commitKey}>use key</button>
          </>
        ) : (
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
        )}
        {STATIC && hasKey && <button className="dock-keybtn" onClick={forgetKey} title="remove the key from this browser">clear key</button>}
        {thread.length > 0 && (
          <button className="dock-toggle" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '⌄ collapse' : '⌃ expand'}
          </button>
        )}
      </div>
      {STATIC && <div className="dock-privacy">{PRIVACY_LINE}</div>}
      {error && <div className="dock-privacy dock-err">{error}</div>}
    </div>
  )
}

// dev only: the relay's facilitator switch (Claude session vs a local Ollama model)
function FacilitatorToggle() {
  const [facilitator, setFacilitator] = useState('claude')
  useEffect(() => {
    fetch('/api/facilitator').then((r) => r.json()).then((j) => setFacilitator(j.model)).catch(() => {})
  }, [])
  const cycle = () => {
    const next = FACILITATORS[(FACILITATORS.indexOf(facilitator) + 1) % FACILITATORS.length]
    fetch('/api/facilitator', { method: 'PUT', body: JSON.stringify({ model: next }) })
      .then((r) => r.json()).then((j) => setFacilitator(j.model)).catch(() => {})
  }
  return (
    <button className="fac-toggle" title="switch facilitator" onClick={cycle}>
      ⇄ {facilitator === 'claude' ? 'claude' : facilitator.split(':')[0]}
    </button>
  )
}
