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
import type { BetRecord, StratRecord } from './model'
import { rungLine } from './instrument'
import { URGENCY_LABEL, countBy, tagOf, type DueItem } from './docket-items'
import rubric from '../shape/eval/rubric-prompt.md?raw'

export const STATIC = import.meta.env.VITE_STATIC === '1'
export const KEY_STORAGE = 'ab-anthropic-key'
export const DIRECT_MODEL = 'claude-sonnet-5'
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const PRIVACY_LINE = `your key stays in this browser's localStorage (${KEY_STORAGE}) and goes only to api.anthropic.com — never logged, never through us.`

// What the user is looking at when they speak — the facilitator sees the same thing.
export interface Scope {
  view: 'canvas' | 'ledger' | 'docket'
  selectedId?: string
  openDocument?: 'diff' | 'calibration' | 'graveyard'
  due?: DueItem[] // when the docket is open
}

export interface Board {
  nodes: Node[]
  thread: ThreadMsg[]
  scope?: Scope
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

export const SCOPE_MAX_LINES = 40
const VIEW_LABEL: Record<Scope['view'], string> = { canvas: 'the canvas (the map)', ledger: 'the ledger (every bet as a row)', docket: 'the docket (the due-list of obligations)' }

// The selected node's record, 3–6 lines. Bets: kind/status, change, fold-if or
// expectation, criteria, rung, outcome. Strats: kind/owner, title, expectation, detail.
function selectedLines(n: Node): string[] {
  const b = (n.data as any)?.bet as BetRecord | undefined
  const s = (n.data as any)?.strat as StratRecord | undefined
  const tag = tagOf(n)
  if (b) {
    const out = [`selected: ${tag} · bet [${b.status}]${b.surface ? ` · surface ${b.surface}` : ''}${b.lockedAt ? ` · locked ${b.lockedAt.slice(0, 10)}` : ''}`]
    out.push(`  change: ${b.change} → ${b.direction} ${b.metric} by ${b.magnitude}`)
    out.push(b.expectation && !b.foldIf ? `  expectation: ${b.expectation}` : `  fold-if: ${b.foldIf}${b.expectation ? ` · expectation: ${b.expectation}` : ''}`)
    out.push(`  criteria: win → ${b.criteria.win} · inconclusive → ${b.criteria.inconclusive} · loss → ${b.criteria.loss}`)
    if (b.instrument) out.push(`  rung: ${rungLine(b.instrument.type)}${typeof b.instrument.spec === 'string' ? ` · ${b.instrument.spec}` : ''}`)
    if (b.status === 'resolved') out.push(`  outcome: ${b.outcome ?? '?'}${b.actuals ? ` · actuals: ${b.actuals}` : ''}${b.deviation ? ' · deviated from the rule' : ''}`)
    return out
  }
  if (s) {
    const out = [`selected: ${tag} · ${s.kind}${s.answered ? ' (answered)' : ''}${s.owner ? ` · owner ${s.owner}` : ''}`]
    out.push(`  ${s.title}`)
    if (s.expectation) out.push(`  expectation: ${s.expectation}`)
    if (s.detail) out.push(`  detail: ${s.detail}`)
    if (s.takeaway) out.push(`  takeaway: ${s.takeaway}`)
    return out
  }
  return [`selected: ${n.id} (an open field)`]
}

// The "you are looking at" block: view, selection, open document, the due-list when
// the docket is open. Capped at SCOPE_MAX_LINES so it never crowds the board out.
export function scopeBlock(nodes: Node[], scope: Scope): string {
  const lines = [`You are looking at: ${VIEW_LABEL[scope.view]}`]
  if (scope.openDocument) lines.push(`open document: ${scope.openDocument === 'diff' ? 'the diff (as-planned vs as-reported)' : scope.openDocument}`)
  const sel = scope.selectedId ? nodes.find((n) => n.id === scope.selectedId) : undefined
  if (sel) lines.push(...selectedLines(sel))
  if (scope.view === 'docket' && scope.due) {
    lines.push(scope.due.length ? `due-list (${scope.due.length}):` : 'due-list: nothing owed')
    const byId = new Map(nodes.map((n) => [n.id, n]))
    for (const d of scope.due) {
      const n = byId.get(d.nodeId)
      lines.push(`  ${URGENCY_LABEL[d.urgency]} · ${n ? tagOf(n) : d.nodeId} · ${d.action} · ${d.reason}`)
    }
  }
  if (lines.length <= SCOPE_MAX_LINES) return lines.join('\n')
  return [...lines.slice(0, SCOPE_MAX_LINES - 1), `  … ${lines.length - SCOPE_MAX_LINES + 1} more lines not shown`].join('\n')
}

// The dock's one-line hint: what the facilitator will see. Mirrors scopeBlock, compressed.
export function scopeLine(nodes: Node[], scope: Scope): string {
  const sel = scope.selectedId ? nodes.find((n) => n.id === scope.selectedId) : undefined
  const parts: string[] = []
  if (sel) {
    const b = (sel.data as any)?.bet as BetRecord | undefined, s = (sel.data as any)?.strat as StratRecord | undefined
    parts.push(`${tagOf(sel)} — ${b ? b.status : s ? `${s.kind}${s.answered ? ', answered' : ''}` : 'open field'}`)
  } else parts.push(scope.view)
  if (scope.view === 'docket' && scope.due) {
    const o = countBy(scope.due, 'overdue'), w = countBy(scope.due, 'this-week')
    parts.push(o ? `${o} overdue` : w ? `${w} this week` : scope.due.length ? `${scope.due.length} owed` : 'nothing owed')
  }
  if (scope.openDocument) parts.push(`${scope.openDocument === 'diff' ? 'the diff' : scope.openDocument} open`)
  return `looking at: ${parts.join(' · ')}`
}

export function boardContext(nodes: Node[], scope?: Scope): string {
  const lines = nodes
    .map((n) => {
      const s = (n.data as any)?.strat, b = (n.data as any)?.bet
      if (s) return `${s.kind}${s.answered ? ' (answered)' : ''}: ${s.title}${s.takeaway ? ' → ' + s.takeaway : ''}`
      if (b) return `bet [${b.status}]: ${b.change} (fold-if: ${b.foldIf})`
      return ''
    })
    .filter(Boolean)
  const board = lines.length ? lines.join('\n') : '(empty board)'
  return scope ? `${scopeBlock(nodes, scope)}\n\nCurrent board:\n${board}` : board
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
    system: (opts.rubric ?? rubric) + '\n\n' + (board.scope ? boardContext(board.nodes, board.scope) : 'Current board:\n' + boardContext(board.nodes)),
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
  // scope rides along on the dump: structured for the inbox, rendered (scopeText) so
  // the relay's localReply can prepend it without rebuilding the block
  async send(text: string, board: Board): Promise<SendResult> {
    try {
      const scope = board.scope
      const r = await fetch('/api/dump', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: mkId(), nodeId: 'dock', text, ts: new Date().toISOString(),
          ...(scope ? { scope, scopeText: scopeBlock(board.nodes, scope) } : {}) }),
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
