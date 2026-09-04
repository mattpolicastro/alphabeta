// The documents are read-only projections: render each against the fixture board
// and assert the shape shows up. Catches runtime errors in the JSX without a browser.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Node } from '@xyflow/react'
import { initialEdges, initialNodes } from '../data'
import { DocOverlay } from '../Doc'

const seq = (nodes: Node[]): Node[] => { let b = 0; return nodes.map((n) => (n.type === 'bet' ? { ...n, data: { ...n.data, seq: ++b } } : n)) }
const nodes = seq(initialNodes)
const render = (req: any) => renderToStaticMarkup(<DocOverlay req={req} nodes={nodes} edges={initialEdges} onClose={() => {}} onOpen={() => {}} />)

describe('documents render against the fixture', () => {
  it('the diff of a resolved bet with a deviation', () => {
    const html = render({ kind: 'diff', nodeId: 'bet-10' })
    expect(html).toContain('as planned')
    expect(html).toContain('m-deviated')
    expect(html).toContain('copy as text')
    expect(html).not.toContain('is-stub')
  })
  it('the diff of a running bet with an amendment', () => {
    const html = render({ kind: 'diff', nodeId: 'bet-4' })
    expect(html).toContain('m-amended')
    expect(html).toContain('14d → 21d')
  })
  it('the calibration mirror, pencil register, on this board', () => {
    const html = render({ kind: 'calibration' })
    expect(html).toContain('is-stub')
    expect(html).toContain('n=6 — too few to say')
    expect(html).toContain('<svg')
    expect(html).toContain('class="sheet-scrim"')
  })
  it('the calibration mirror falls back to the fixture on an empty board', () => {
    const html = renderToStaticMarkup(<DocOverlay req={{ kind: 'calibration' }} nodes={[]} edges={[]} onClose={() => {}} onOpen={() => {}} />)
    expect(html).toContain('fixture data')
    expect(html).toContain('n=6')
  })
  it('the graveyard lists the two lost bets', () => {
    const html = render({ kind: 'graveyard' })
    expect(html).toContain('2 buried')
    expect(html).toContain('days on the clock')
  })
})
