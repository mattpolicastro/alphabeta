// React Flow takes colours as props (Background color, edge stroke, marker
// fill, MiniMap nodeColor), so those values cannot come from a class. Rather
// than keep a second copy of the palette in JS — which is how the grid ended up
// near-white on the dark ground — read the resolved tokens off the document and
// re-read them when the theme changes. src/styles.css stays the only palette.
import { useEffect, useState } from 'react'

export const TOKEN_NAMES = [
  'ink', 'terra', 'fade', 'edge', 'edge-strong', 'grid',
  'win', 'incon', 'loss', 'paper', 'paper-raised',
] as const

export type TokenName = (typeof TOKEN_NAMES)[number]
export type Tokens = Record<TokenName, string>

function read(): Tokens {
  const cs = getComputedStyle(document.documentElement)
  const out = {} as Tokens
  for (const n of TOKEN_NAMES) out[n] = cs.getPropertyValue(`--${n}`).trim()
  return out
}

/** The live palette. One media listener plus one attribute observer, memoised. */
export function useTokens(): Tokens {
  const [tokens, setTokens] = useState<Tokens>(read)

  useEffect(() => {
    const refresh = () => setTokens((prev) => {
      const next = read()
      return TOKEN_NAMES.every((n) => prev[n] === next[n]) ? prev : next
    })
    refresh()
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', refresh)
    const obs = new MutationObserver(refresh)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })
    return () => { mq.removeEventListener('change', refresh); obs.disconnect() }
  }, [])

  return tokens
}
