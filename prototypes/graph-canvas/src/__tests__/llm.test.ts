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
