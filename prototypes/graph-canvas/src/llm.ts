// The LLMProvider seam (handoff §5): the dock talks to one interface; boot picks
// the implementation. Two today —
//   RelayProvider           dev: POST /api/dump, replies arrive via /api/replies polling
//   AnthropicDirectProvider static: browser → api.anthropic.com with the user's own key
//
// adapted from apps/web/lib/llm/provider.ts @ 01a31a7 — the interface + boot-time
// negotiation; the Ollama-through-/api/llm implementation is not carried over
// (the static build has no /api/*). The board-context builder is a port of
// `localReply` in vite.config.ts so both facilitators see the same board.
//
// Key handling: the key lives ONLY in localStorage under KEY_STORAGE. It is read
// at send time, never logged, never persisted anywhere else, and sent to no host
// but ANTHROPIC_URL. PRIVACY_LINE is the one sentence the UI must show.
import type { Node } from '@xyflow/react'
import type { ThreadMsg } from './Thread'
import rubric from '../shape/eval/rubric-prompt.md?raw'

export const STATIC = import.meta.env.VITE_STATIC === '1'
export const KEY_STORAGE = 'ab-anthropic-key'
export const DIRECT_MODEL = 'claude-sonnet-5'
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const PRIVACY_LINE = `your key stays in this browser's localStorage (${KEY_STORAGE}) and goes only to api.anthropic.com — never logged, never through us.`

export interface Board {
  nodes: Node[]
  thread: ThreadMsg[]
}

export interface SendResult {
  captured: boolean // the message reached the facilitator
  reply?: string // present when the provider answers inline (direct); relay replies arrive by polling
  error?: string
}

export interface LLMProvider {
  readonly id: 'relay' | 'anthropic-direct'
  readonly available: boolean
  send(text: string, board: Board): Promise<SendResult>
}

// ── pure: what the facilitator sees ──────────────────────────────────

export function boardContext(nodes: Node[]): string {
  const lines = nodes
    .map((n) => {
      const s = (n.data as any)?.strat, b = (n.data as any)?.bet
      if (s) return `${s.kind}${s.answered ? ' (answered)' : ''}: ${s.title}${s.takeaway ? ' → ' + s.takeaway : ''}`
      if (b) return `bet [${b.status}]: ${b.change} (fold-if: ${b.foldIf})`
      return ''
    })
    .filter(Boolean)
  return lines.length ? lines.join('\n') : '(empty board)'
}

export type Turn = { role: 'user' | 'assistant'; content: string }

// last 12 messages, the one being sent excluded (the relay dedups the same way)
export function threadHistory(thread: ThreadMsg[], exclude?: string): Turn[] {
  return thread
    .slice(-12)
    .filter((m) => m.text !== exclude)
    .map((m) => ({ role: m.role === 'you' ? 'user' : 'assistant', content: m.text }))
}

export interface MessagesRequest {
  model: string
  max_tokens: number
  system: string
  messages: Turn[]
}

export function buildRequest(text: string, board: Board, opts: { model?: string; rubric?: string; maxTokens?: number } = {}): MessagesRequest {
  return {
    model: opts.model ?? DIRECT_MODEL,
    max_tokens: opts.maxTokens ?? 6000,
    system: (opts.rubric ?? rubric) + '\n\nCurrent board:\n' + boardContext(board.nodes),
    messages: [...threadHistory(board.thread, text), { role: 'user', content: text }],
  }
}

// ── key storage ──────────────────────────────────────────────────────

export function loadKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' }
}
export function saveKey(key: string): void {
  try { key.trim() ? localStorage.setItem(KEY_STORAGE, key.trim()) : localStorage.removeItem(KEY_STORAGE) } catch {}
}
export function clearKey(): void {
  try { localStorage.removeItem(KEY_STORAGE) } catch {}
}

// ── providers ────────────────────────────────────────────────────────

const mkId = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export class RelayProvider implements LLMProvider {
  readonly id = 'relay' as const
  readonly available = true
  async send(text: string): Promise<SendResult> {
    try {
      const r = await fetch('/api/dump', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: mkId(), nodeId: 'dock', text, ts: new Date().toISOString() }),
      })
      return { captured: r.ok }
    } catch {
      return { captured: false, error: 'relay unreachable' }
    }
  }
}

export class AnthropicDirectProvider implements LLMProvider {
  readonly id = 'anthropic-direct' as const
  constructor(private readKey: () => string = loadKey) {}
  get available(): boolean { return !!this.readKey() }
  async send(text: string, board: Board): Promise<SendResult> {
    const key = this.readKey()
    if (!key) return { captured: false, error: 'no key — paste an Anthropic API key to talk' }
    let res: Response
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(buildRequest(text, board)),
      })
    } catch {
      return { captured: false, error: 'api.anthropic.com unreachable' }
    }
    // error bodies never contain the key; surface the provider's own message only
    let j: any = null
    try { j = await res.json() } catch {}
    if (!res.ok) return { captured: false, error: `anthropic ${res.status}: ${j?.error?.message ?? res.statusText}` }
    const reply = (j?.content ?? []).map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim()
    if (j?.stop_reason === 'refusal') return { captured: true, reply: reply || '(the model declined this one)' }
    return { captured: true, reply }
  }
}

// Boot-time negotiation: the static build has no /api/*, so it can only go direct.
export function providerFor(staticBuild: boolean = STATIC): LLMProvider {
  return staticBuild ? new AnthropicDirectProvider() : new RelayProvider()
}
