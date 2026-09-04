// The prodbar menus and the shared sheet, rendered: aria wiring, disabled hint,
// pencil register for stub rows, and one shell for trays and documents.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Menu } from '../Menu'
import { Overlay } from '../Overlay'
import { LoopTray } from '../LoopTray'
import { IntakeTray } from '../IntakeTray'

describe('Menu', () => {
  it('is a closed menu button with aria-haspopup until opened', () => {
    const html = renderToStaticMarkup(<Menu label="documents" items={[{ id: 'a', label: 'a' }]} />)
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('role="menu"')
  })
})

describe('Overlay', () => {
  it('trays and documents share the header strip; documents add the scrim and dialog role', () => {
    const tray = renderToStaticMarkup(<Overlay kind="tray" eyebrow="e" title="t" onClose={() => {}}>x</Overlay>)
    const doc = renderToStaticMarkup(<Overlay kind="doc" eyebrow="e" title="t" meta="m" onClose={() => {}}>x</Overlay>)
    for (const h of [tray, doc]) {
      expect(h).toContain('class="sheet-head"')
      expect(h).toContain('class="sheet-eyebrow">e<')
      expect(h).toContain('class="sheet-title">t<')
      expect(h).toContain('aria-label="close"')
    }
    expect(tray).toContain('<aside class="sheet tray ')
    expect(doc).toContain('class="sheet-scrim"')
    expect(doc).toContain('role="dialog"')
    expect(doc).toContain('class="sheet-meta">m<')
  })
  it('both trays render through the shell', () => {
    expect(renderToStaticMarkup(<LoopTray onClose={() => {}} onTry={() => {}} />)).toContain('class="sheet tray loop"')
    expect(renderToStaticMarkup(<IntakeTray onClose={() => {}} onPlace={() => {}} />)).toContain('class="sheet tray intake')
  })
})
