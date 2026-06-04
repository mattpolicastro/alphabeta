import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { Connection } from '@/lib/strategy/types'
import { useBoard, useLineageSet } from '@/components/strategy/hooks/useBoardState'
import { getTemplate } from '@/lib/strategy/templates'
import {
  useConnections,
  useHiddenCardIds,
  type ArrowGeometry,
} from '@/components/strategy/hooks/useConnections'

// ---------------------------------------------------------------------------
// Categorical palette (ColorBrewer Set2-inspired, 8 hues)
// ---------------------------------------------------------------------------

const CHAIN_PALETTE = [
  { full: '#e07070', desat: '#e8c4c4' },
  { full: '#6ba3d6', desat: '#c4d8e8' },
  { full: '#7bc87b', desat: '#c4e4c4' },
  { full: '#d4a55a', desat: '#e4d4b8' },
  { full: '#b07cc8', desat: '#d8c4e4' },
  { full: '#e0839e', desat: '#e8c8d4' },
  { full: '#5cbcbc', desat: '#b8dede' },
  { full: '#c8a060', desat: '#e0d0b0' },
]

/**
 * Assign colors by source card's target-set signature. Source cards
 * with the same set of targets share a color. Multi-target sources
 * (shared children) get their own color.
 */
function assignChainColors(
  connections: Connection[],
): Map<string, { full: string; desat: string }> {
  // Build target set per source card.
  const sourceTargets = new Map<string, Set<string>>()
  for (const c of connections) {
    const set = sourceTargets.get(c.fromCardId)
    if (set) set.add(c.toCardId)
    else sourceTargets.set(c.fromCardId, new Set([c.toCardId]))
  }
  function targetSig(fromCardId: string): string {
    const targets = sourceTargets.get(fromCardId)
    if (!targets) return fromCardId
    return [...targets].sort().join(',')
  }
  const sigToIdx = new Map<string, number>()
  let nextIdx = 0
  const result = new Map<string, { full: string; desat: string }>()
  for (const c of connections) {
    const sig = targetSig(c.fromCardId)
    if (!sigToIdx.has(sig)) sigToIdx.set(sig, nextIdx++)
    const idx = sigToIdx.get(sig)!
    result.set(c.id, CHAIN_PALETTE[idx % CHAIN_PALETTE.length])
  }
  return result
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FADE_MS = 200

interface ConnectionLayerProps {
  containerRef: RefObject<HTMLElement | null>
}

export function ConnectionLayer({ containerRef }: ConnectionLayerProps) {
  const { state, dispatch } = useBoard()
  const hidden = useHiddenCardIds(
    state.cards,
    state.templateId,
    state.ui.columnFilters,
  )
  const template = getTemplate(state.templateId)
  const geoms = useConnections({
    containerRef,
    connections: state.connections,
    hiddenCardIds: hidden,
    arrowTick: state.ui.arrowTick,
    direction: template.direction,
  })
  const selectedId = state.ui.selectedConnectionId
  const focusActive = state.ui.focusedCardId !== null
  const lineage = useLineageSet()

  const connectionsById = useMemo(() => {
    const m = new Map<string, Connection>()
    for (const c of state.connections) m.set(c.id, c)
    return m
  }, [state.connections])

  const chainColors = useMemo(
    () => assignChainColors(state.connections),
    [state.connections],
  )

  const sortedGeoms = useMemo(
    () => [...geoms].sort((a, b) => (a.sy + a.ty) / 2 - (b.sy + b.ty) / 2),
    [geoms],
  )

  // Crossfade: keep the previous geoms visible while fading out, show
  // the new geoms fading in. This avoids the snap caused by React
  // replacing <path> elements with new `d` attributes.
  const [displayGeoms, setDisplayGeoms] = useState(sortedGeoms)
  const [fadePhase, setFadePhase] = useState<'visible' | 'fading-out' | 'fading-in'>('visible')
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // On first render or when geoms haven't actually changed, skip.
    if (sortedGeoms === displayGeoms) return
    if (sortedGeoms.length === 0 && displayGeoms.length === 0) return

    // If the paths are identical (same IDs and d attributes), skip the fade.
    const same =
      sortedGeoms.length === displayGeoms.length &&
      sortedGeoms.every(
        (g, i) => g.id === displayGeoms[i]?.id && g.d === displayGeoms[i]?.d,
      )
    if (same) {
      setDisplayGeoms(sortedGeoms)
      return
    }

    // First render with geoms: show immediately without fade.
    if (displayGeoms.length === 0) {
      setDisplayGeoms(sortedGeoms)
      return
    }

    // Start fade-out of current paths.
    setFadePhase('fading-out')
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => {
      // Swap to new geoms and fade in.
      setDisplayGeoms(sortedGeoms)
      setFadePhase('fading-in')
      fadeTimer.current = setTimeout(() => {
        setFadePhase('visible')
      }, FADE_MS)
    }, FADE_MS)

    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedGeoms])

  const usedColors = useMemo(() => {
    const set = new Set<string>()
    for (const [, color] of chainColors) {
      set.add(color.full)
      set.add(color.desat)
    }
    return set
  }, [chainColors])

  if (displayGeoms.length === 0 && sortedGeoms.length === 0) return null

  const svgOpacity =
    fadePhase === 'fading-out' ? 0 : fadePhase === 'fading-in' ? 1 : 1

  function getArrowColor(g: ArrowGeometry) {
    const conn = connectionsById.get(g.id)
    const inLineage =
      !focusActive ||
      (conn
        ? lineage.has(conn.fromCardId) && lineage.has(conn.toCardId)
        : false)
    const faded = focusActive && !inLineage
    const selected = g.id === selectedId
    const chain = chainColors.get(g.id) ?? CHAIN_PALETTE[0]
    const stroke = selected ? '#333' : faded ? chain.desat : chain.full
    return { stroke, faded, selected }
  }

  function renderArrow(g: ArrowGeometry) {
    const { stroke, selected } = getArrowColor(g)
    return (
      <g key={g.id}>
        {/* Invisible wide hit area for easier clicking */}
        <path
          d={g.d}
          fill="none"
          stroke="transparent"
          strokeWidth={12}
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'SELECT_CONNECTION', id: g.id })
          }}
        />
        {/* Visible arrow */}
        <path
          data-connection-id={g.id}
          d={g.d}
          fill="none"
          stroke={stroke}
          strokeWidth={selected ? 3 : 1.75}
          markerEnd={
            selected
              ? 'url(#arrow-selected)'
              : `url(#arrow-${stroke.replace('#', '')})`
          }
          style={{ pointerEvents: 'none' }}
        />
      </g>
    )
  }

  // Split by paint order: faded first, focused second, selected last.
  const fadedArrows: ArrowGeometry[] = []
  const focusedArrows: ArrowGeometry[] = []
  const selectedArrows: ArrowGeometry[] = []
  for (const g of displayGeoms) {
    const { faded, selected } = getArrowColor(g)
    if (selected) selectedArrows.push(g)
    else if (faded) fadedArrows.push(g)
    else focusedArrows.push(g)
  }

  // Selected arrow midpoint for the inline delete button.
  const selectedArrow = displayGeoms.find((g) => g.id === selectedId)
  const selectedMid = selectedArrow
    ? {
        x: (selectedArrow.sx + selectedArrow.tx) / 2,
        y: (selectedArrow.sy + selectedArrow.ty) / 2,
      }
    : null

  return (
    <>
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        overflow: 'visible',
        opacity: svgOpacity,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
      }}
    >
      <defs>
        {[...usedColors].map((color) => (
          <marker
            key={color}
            id={`arrow-${color.replace('#', '')}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
        <marker
          id="arrow-selected"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
        </marker>
      </defs>
      {fadedArrows.map(renderArrow)}
      {focusedArrows.map(renderArrow)}
      {selectedArrows.map(renderArrow)}
    </svg>
    {selectedMid && selectedArrow ? (
      <button
        type="button"
        aria-label="Remove connection"
        data-connection-delete
        onClick={(e) => {
          e.stopPropagation()
          dispatch({ type: 'REMOVE_CONNECTION', id: selectedArrow.id })
        }}
        className="pointer-events-auto absolute z-20 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] text-gray-600 shadow-md transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600"
        style={{
          left: selectedMid.x,
          top: selectedMid.y,
        }}
      >
        ✕
      </button>
    ) : null}
    </>
  )
}

export type { Connection }
