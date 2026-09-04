import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Node } from '@xyflow/react'
import { ANTHROPIC_URL, AnthropicDirectProvider, DIRECT_MODEL, KEY_STORAGE, PRIVACY_LINE, boardContext, buildRequest, providerFor, threadHistory } from '../llm'

const nodes: Node[] = [
  { id: 'g', type: 'strat', position: { x: 0, y: 0 }, data: { strat: { kind: 'goal', title: 'Double ARR' } } },
  { id: 'q', type: 'strat', position: { x: 0, y: 0 }, data: { strat: { kind: 'question', title: 'Where do deals stall?', answered: true, takeaway: 'after the demo' } } },
  { id: 'b', type: 'bet', position: { x: 0, y: 0 }, data: { bet: { status: 'locked', change: 'shorter demo', foldIf: '+1pp' } } },
  { id: 'f', type: 'openfield', position: { x: 0, y: 0 }, data: { thread: [] } },
]

describe('boardContext — the same lines the relay builds', () => {
  it('one line per strat/bet, answered + takeaway marked, open fields skipped', () => {
    expect(boardContext(nodes).split('\n')).toEqual([
      'goal: Double ARR',
      'question (answered): Where do deals stall? → after the demo',
      'bet [locked]: shorter demo (fold-if: +1pp)',
    ])
  })
  it('an empty board says so', () => {
    expect(boardContext([])).toBe('(empty board)')
    expect(boardContext([nodes[3]])).toBe('(empty board)')
  })
})

describe('threadHistory', () => {
  const thread = Array.from({ length: 15 }, (_, i) => ({ role: (i % 2 ? 'claude' : 'you') as 'you' | 'claude', text: `m${i}` }))
  it('keeps the last 12, maps roles, drops the message being sent', () => {
    const h = threadHistory([...thread, { role: 'you', text: 'now' }], 'now')
    expect(h).toHaveLength(11)
    expect(h[0]).toEqual({ role: 'user', content: 'm4' })
    expect(h[1].role).toBe('assistant')
    expect(h.some((t) => t.content === 'now')).toBe(false)
  })
})

describe('buildRequest', () => {
  it('rubric + board in system, history + the new turn in messages, pinned model', () => {
    const req = buildRequest('what next?', { nodes, thread: [{ role: 'you', text: 'hi' }, { role: 'claude', text: 'hello' }] }, { rubric: 'RUBRIC' })
    expect(req.model).toBe(DIRECT_MODEL)
    expect(req.system).toBe('RUBRIC\n\nCurrent board:\ngoal: Double ARR\nquestion (answered): Where do deals stall? → after the demo\nbet [locked]: shorter demo (fold-if: +1pp)')
    expect(req.messages).toEqual([{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }, { role: 'user', content: 'what next?' }])
  })
  it('ships the real rubric by default', () => {
    expect(buildRequest('x', { nodes: [], thread: [] }).system).toMatch(/^You are the reflect step/)
  })
})

describe('AnthropicDirectProvider', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('is unavailable without a key and refuses to send', async () => {
    const p = new AnthropicDirectProvider(() => '')
    expect(p.available).toBe(false)
    expect(await p.send('hi', { nodes: [], thread: [] })).toMatchObject({ captured: false, error: expect.stringMatching(/no key/) })
  })
  it('sends the key only to api.anthropic.com with the browser-access header, and never echoes it', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'push back: ' }, { type: 'text', text: 'why?' }], stop_reason: 'end_turn' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const p = new AnthropicDirectProvider(() => 'sk-ant-secret')
    const r = await p.send('hi', { nodes: [], thread: [] })
    expect(r).toEqual({ captured: true, reply: 'push back: why?' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(ANTHROPIC_URL)
    const h = init.headers as Record<string, string>
    expect(h['x-api-key']).toBe('sk-ant-secret')
    expect(h['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(String(init.body)).not.toContain('sk-ant-secret')
    expect(JSON.parse(String(init.body)).model).toBe(DIRECT_MODEL)
  })
  it('surfaces the provider error message without the key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), { status: 401, statusText: 'Unauthorized' })))
    const r = await new AnthropicDirectProvider(() => 'sk-ant-secret').send('hi', { nodes: [], thread: [] })
    expect(r.captured).toBe(false)
    expect(r.error).toBe('anthropic 401: invalid x-api-key')
    expect(r.error).not.toContain('sk-ant-secret')
  })
})

describe('negotiation + the one sentence', () => {
  it('static goes direct, dev goes relay', () => {
    expect(providerFor(true).id).toBe('anthropic-direct')
    expect(providerFor(false).id).toBe('relay')
  })
  it('the privacy line names the storage key and the only destination', () => {
    expect(PRIVACY_LINE).toContain(KEY_STORAGE)
    expect(PRIVACY_LINE).toContain('api.anthropic.com')
    expect(PRIVACY_LINE.match(/\.(\s|$)/g)).toHaveLength(1) // one sentence
  })
})

// ── scope: what the facilitator sees of the current view ─────────────
import { SCOPE_MAX_LINES, scopeBlock, scopeLine, RelayProvider, type Scope } from '../llm'
import type { DueItem } from '../docket-items'

const scopedNodes: Node[] = [
  { id: 'b2', type: 'bet', position: { x: 0, y: 0 }, data: { seq: 2, bet: { status: 'locked', change: 'shorter demo', direction: 'reduce', metric: 'sales cycle', magnitude: '30 days', foldIf: '−10 days', surface: 'marketing', lockedAt: '2026-08-20T00:00:00.000Z', instrument: { type: 'ab', spec: '50/50 · 14 days' }, criteria: { win: 'keep', inconclusive: 'hold', loss: 'revert' } } } },
  { id: 'q1', type: 'strat', position: { x: 0, y: 0 }, data: { seq: 1, strat: { kind: 'question', title: 'Where do deals stall?', owner: 'Priya', expectation: 'after the demo', detail: 'stage timestamps unpulled' } } },
]
const due: DueItem[] = [
  { id: 'maturation:b2', kind: 'maturation', nodeId: 'b2', urgency: 'overdue', action: 'resolve', reason: 'matured 6 days ago (14d from the spec)' },
  { id: 'question:q1', kind: 'question', nodeId: 'q1', urgency: 'off-clock', action: 'answer', reason: 'owned by Priya, open 21 days', ageDays: 21 },
]

describe('scopeBlock — the "you are looking at" block', () => {
  it('canvas with a bet selected: the record on 3–6 lines', () => {
    const lines = scopeBlock(scopedNodes, { view: 'canvas', selectedId: 'b2' }).split('\n')
    expect(lines[0]).toBe('You are looking at: the canvas (the map)')
    expect(lines[1]).toBe('selected: B2 · bet [locked] · surface marketing · locked 2026-08-20')
    expect(lines.slice(2)).toEqual([
      '  change: shorter demo → reduce sales cycle by 30 days',
      '  fold-if: −10 days',
      '  criteria: win → keep · inconclusive → hold · loss → revert',
      '  rung: ab · rung 5 · valid (causal) · 50/50 · 14 days',
    ])
    expect(lines.length - 1).toBeLessThanOrEqual(6)
  })
  it('a selected question shows owner, title, expectation, detail', () => {
    expect(scopeBlock(scopedNodes, { view: 'canvas', selectedId: 'q1' }).split('\n').slice(1)).toEqual([
      'selected: Q1 · question · owner Priya',
      '  Where do deals stall?',
      '  expectation: after the demo',
      '  detail: stage timestamps unpulled',
    ])
  })
  it('ledger with a document open, nothing selected', () => {
    expect(scopeBlock(scopedNodes, { view: 'ledger', openDocument: 'diff' })).toBe('You are looking at: the ledger (every bet as a row)\nopen document: the diff (as-planned vs as-reported)')
  })
  it('docket: one line per due item — urgency · tag · action · reason', () => {
    const lines = scopeBlock(scopedNodes, { view: 'docket', due }).split('\n')
    expect(lines).toEqual([
      'You are looking at: the docket (the due-list of obligations)',
      'due-list (2):',
      '  overdue · B2 · resolve · matured 6 days ago (14d from the spec)',
      '  off the clock · Q1 · answer · owned by Priya, open 21 days',
    ])
    expect(scopeBlock(scopedNodes, { view: 'docket', due: [] })).toContain('due-list: nothing owed')
  })
  it('caps the block at 40 lines and says how many were cut', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...due[0], id: `m${i}`, nodeId: 'b2' }))
    const lines = scopeBlock(scopedNodes, { view: 'docket', due: many }).split('\n')
    expect(lines).toHaveLength(SCOPE_MAX_LINES)
    expect(lines[SCOPE_MAX_LINES - 1]).toBe('  … 23 more lines not shown')
  })
})

describe('scope rides into both providers', () => {
  const scope: Scope = { view: 'docket', due }
  it('boardContext without a scope is unchanged; with one, the block precedes the board', () => {
    expect(boardContext(scopedNodes)).toBe('bet [locked]: shorter demo (fold-if: −10 days)\nquestion: Where do deals stall?')
    expect(boardContext(scopedNodes, scope)).toBe(scopeBlock(scopedNodes, scope) + '\n\nCurrent board:\nbet [locked]: shorter demo (fold-if: −10 days)\nquestion: Where do deals stall?')
  })
  it('buildRequest puts the block in the system prompt after the rubric', () => {
    const req = buildRequest('x', { nodes: scopedNodes, thread: [], scope }, { rubric: 'RUBRIC' })
    expect(req.system.startsWith('RUBRIC\n\nYou are looking at: the docket')).toBe(true)
    expect(req.system).toContain('\n\nCurrent board:\n')
  })
  it('the relay dump carries scope (structured) and scopeText (rendered)', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await new RelayProvider().send('hi', { nodes: scopedNodes, thread: [], scope })
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(body.scope).toEqual(scope)
    expect(body.scopeText).toBe(scopeBlock(scopedNodes, scope))
    expect(body.nodeId).toBe('dock')
    vi.unstubAllGlobals()
  })
})

describe('scopeLine — the dock hint', () => {
  it('names the view, the selection, the docket count, the open document', () => {
    expect(scopeLine(scopedNodes, { view: 'canvas' })).toBe('looking at: canvas')
    expect(scopeLine(scopedNodes, { view: 'canvas', selectedId: 'b2' })).toBe('looking at: B2 — locked')
    expect(scopeLine(scopedNodes, { view: 'docket', due })).toBe('looking at: docket · 1 overdue')
    expect(scopeLine(scopedNodes, { view: 'docket', due: [due[1]] })).toBe('looking at: docket · 1 owed')
    expect(scopeLine(scopedNodes, { view: 'docket', due: [] })).toBe('looking at: docket · nothing owed')
    expect(scopeLine(scopedNodes, { view: 'ledger', selectedId: 'q1', openDocument: 'diff' })).toBe('looking at: Q1 — question · the diff open')
  })
})
