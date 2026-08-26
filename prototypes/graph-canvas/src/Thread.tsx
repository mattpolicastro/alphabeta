export interface ThreadMsg {
  id?: string
  role: 'you' | 'claude'
  text: string
  status?: 'sending' | 'captured' | 'failed'
}

const STATUS_LABEL: Record<string, string> = {
  sending: 'sending ⋯',
  captured: 'captured ✓',
  failed: 'not captured ⚠',
}

export function Thread({ msgs, awaiting }: { msgs: ThreadMsg[]; awaiting: boolean }) {
  return (
    <>
      {msgs.map((m, i) => (
        <div key={m.id ?? i} className={`msg-row ${m.role}`}>
          <div className={`msg ${m.role}`}>
            {m.text.split(/\n{2,}/).map((para, j) => (
              <p key={j}>{para}</p>
            ))}
            {m.role === 'you' && m.status && (
              <div className={`msg-status st-${m.status}`}>{STATUS_LABEL[m.status]}</div>
            )}
          </div>
        </div>
      ))}
      {awaiting && (
        <div className="msg-row claude">
          <div className="msg claude waiting">⋯ thinking</div>
        </div>
      )}
    </>
  )
}
