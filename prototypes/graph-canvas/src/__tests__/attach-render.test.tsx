// The attach picker and the cockpit's evidence rows, rendered without a browser —
// catches runtime errors in the JSX, same pattern as docs-render.test.tsx.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Node } from '@xyflow/react'
import { initialNodes } from '../data'
import { parseAttach, type AttachParsed } from '../attach'
import { AttachOverlay } from '../AttachPicker'
import { Cockpit } from '../Cockpit'
import type { BetRecord } from '../model'

const seq = (nodes: Node[]): Node[] => { let b = 0; return nodes.map((n) => (n.type === 'bet' ? { ...n, data: { ...n.data, seq: ++b } } : n)) }
const parsed = parseAttach('from=srm&v=1&expected=50,50&observed=5000,4600&alpha=0.001&seal=' + 'a'.repeat(64)) as AttachParsed
const noop = () => {}

describe('the attach picker', () => {
  it('lists in-flight bets first, resolved as post-hoc, pre-lock counted out', () => {
    const html = renderToStaticMarkup(<AttachOverlay parsed={parsed} nodes={seq(initialNodes)} onPick={noop} onSeed={noop} onClose={noop} />)
    expect(html).toContain('attach to a bet · from /lab/srm')
    expect(html).toContain('→ mismatch — the split is not the one configured')
    expect(html).toContain('sealed aaaaaaaa…')
    expect(html.indexOf('in flight')).toBeLessThan(html.indexOf('post-hoc'))
    expect(html).toContain('4 pre-lock bets not listed')
    expect(html).not.toContain('seed the demo board')
  })
  it('an empty board offers to seed the demo', () => {
    const html = renderToStaticMarkup(<AttachOverlay parsed={parsed} nodes={[]} onPick={noop} onSeed={noop} onClose={noop} />)
    expect(html).toContain('no bet on this board can take evidence')
    expect(html).toContain('seed the demo board')
  })
})

describe('the cockpit evidence section', () => {
  const bet = (initialNodes.find((n) => n.id === 'bet-4')!.data as any).bet as BetRecord
  it('renders each record with its seal state and a lab link', () => {
    const h = 'b'.repeat(64)
    const evidence = [
      { id: 'e1', ts: '2026-09-04T10:00:00.000Z', tool: 'srm' as const, v: 1, params: {}, canonical: 'v=1&expected=50,50&observed=5000,4800&alpha=0.001', hash: h, seal: h, summary: 'SRM: one', verdict: 'ok' as const },
      { id: 'e2', ts: '2026-09-05T10:00:00.000Z', tool: 'srm' as const, v: 1, params: {}, canonical: 'v=1', hash: h, summary: 'SRM: two', verdict: 'mismatch' as const },
    ]
    const html = renderToStaticMarkup(<Cockpit id="bet-4" bet={{ ...bet, evidence }} onMoment={noop} />)
    expect(html).toContain('sealed · verified')
    expect(html).toContain('>unsealed<')
    expect(html).toContain('href="https://alphabeta.tools/lab/srm/?v=1&amp;expected=50,50&amp;observed=5000,4800&amp;alpha=0.001"')
    expect(html.indexOf('SRM: one')).toBeLessThan(html.indexOf('SRM: two'))
  })
  it('says so when nothing is attached', () => {
    expect(renderToStaticMarkup(<Cockpit id="bet-4" bet={bet} onMoment={noop} />)).toContain('none attached')
  })
})
