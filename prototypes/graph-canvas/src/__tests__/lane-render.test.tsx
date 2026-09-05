// The lane layer and the solution card's two actions — the visual contract of
// the 2026-09-04 weight-and-colour spec, asserted where it is cheapest to break.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReactFlowProvider } from '@xyflow/react'
import { LaneLayer } from '../LaneLayer'
import { BetNode, StratNode } from '../nodes'

const lanes = (orient: 'v' | 'h', generations: number) =>
  renderToStaticMarkup(
    <ReactFlowProvider>
      <LaneLayer orient={orient} generations={generations} />
    </ReactFlowProvider>,
  )

describe('LaneLayer', () => {
  it('draws one band per lane, labelled, inside a viewport-transformed layer', () => {
    const html = lanes('v', 2)
    expect(html).toContain('class="lanes"')
    expect(html).toContain('transform:translate(0px, 0px) scale(1)')
    expect(html.match(/class="lane lane-v/g)).toHaveLength(5)
    for (const l of ['goals', 'problems', 'questions · solutions', 'bets', 'bets · gen 2'])
      expect(html).toContain(`<span class="lane-label">${l}</span>`)
  })

  it('washes alternating bands only', () => {
    expect(lanes('v', 2).match(/lane-v wash/g)).toHaveLength(2)
  })

  it('follows the orientation: rows when vertical, columns when horizontal', () => {
    expect(lanes('v', 1)).toContain('top:-100px;height:200px')
    expect(lanes('h', 1)).toContain('left:-165px;width:330px')
    expect(lanes('h', 1)).toContain('class="lane lane-h')
  })
})

describe('solution card', () => {
  it('offers place a bet and ask a question at equal weight, neither accented', () => {
    const html = renderToStaticMarkup(
      <ReactFlowProvider>
        <StratNode data={{ strat: { kind: 'solution', title: 'X' }, onElevate: () => {}, onAsk: () => {} }} selected={false} />
      </ReactFlowProvider>,
    )
    expect(html).toContain('>place a bet<')
    expect(html).toContain('>ask a question<')
    expect(html.match(/class="act"/g)).toHaveLength(2)
    expect(html).not.toContain('elevate to bet')
  })
})

describe('bet card', () => {
  it('marks the locked seal on the pill', () => {
    const bet = { status: 'locked', outcome: null, change: 'c', metric: 'm', magnitude: '1', direction: 'lift', foldIf: 'f', surface: 's' }
    const html = renderToStaticMarkup(
      <ReactFlowProvider><BetNode data={{ bet }} selected={false} /></ReactFlowProvider>,
    )
    expect(html).toContain('◆ LOCKED')
    expect(html).toContain('pill s-locked')
  })
})
