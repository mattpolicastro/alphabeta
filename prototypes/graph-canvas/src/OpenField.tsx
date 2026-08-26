import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Thread, type ThreadMsg } from './Thread'

export function OpenFieldNode({ id, data, selected }: any) {
  const [draft, setDraft] = useState('')
  const thread = (data.thread ?? []) as ThreadMsg[]
  const awaiting = thread.length > 0 && thread[thread.length - 1].role === 'you'

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    data.onSend?.(id, text)
  }

  return (
    <div className={`node openfield ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={data.orient === 'h' ? Position.Left : Position.Top} />
      <div className="node-eyebrow">open field</div>

      <Thread msgs={thread} awaiting={awaiting} />

      <textarea
        className="nodrag nowheel nopan"
        rows={2}
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
      <div className="of-hint">↵ to send · shift-↵ for newline</div>
      <Handle type="source" position={data.orient === 'h' ? Position.Right : Position.Bottom} />
    </div>
  )
}
