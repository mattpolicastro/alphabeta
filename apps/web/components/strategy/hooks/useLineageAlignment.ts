import {
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { Connection } from '@/lib/strategy/types'
import { ANCHOR_OFFSET_PX } from './useConnections'

/**
 * Computes per-card Y-translate offsets for focus mode.
 *
 * Lineage cards (ancestors + descendants) align horizontally so arrows
 * run straight. Non-lineage cards in the same columns are pushed down
 * so they never overlap with the repositioned lineage cards.
 *
 * Returns a map of cardId → pixel offset for ALL visible cards that need
 * to move (both lineage and non-lineage). Cards not in the map stay put.
 */
export function useLineageAlignment(options: {
  containerRef: RefObject<HTMLElement | null>
  focusedCardId: string | null
  lineage: Set<string>
  connections: Connection[]
  arrowTick: number
}): Map<string, number> {
  const { containerRef, focusedCardId, lineage, connections, arrowTick } =
    options
  const [offsets, setOffsets] = useState<Map<string, number>>(() => new Map())
  const lastSigRef = useRef<string>('')

  useLayoutEffect(() => {
    function compute() {
      const container = containerRef.current
      if (!container || !focusedCardId || lineage.size === 0) {
        if (offsets.size !== 0) {
          lastSigRef.current = ''
          setOffsets(new Map())
        }
        return
      }

      const focused = findCardElement(container, focusedCardId)
      if (!focused) {
        if (offsets.size !== 0) {
          lastSigRef.current = ''
          setOffsets(new Map())
        }
        return
      }

      // ── Step 1: measure all cards and build graph ──────────────

      // Build adjacency (restricted to lineage).
      const parents = new Map<string, string[]>()
      const children = new Map<string, string[]>()
      for (const c of connections) {
        if (!lineage.has(c.fromCardId) || !lineage.has(c.toCardId)) continue
        const p = parents.get(c.toCardId)
        if (p) p.push(c.fromCardId)
        else parents.set(c.toCardId, [c.fromCardId])
        const ch = children.get(c.fromCardId)
        if (ch) ch.push(c.toCardId)
        else children.set(c.fromCardId, [c.toCardId])
      }

      interface CardMeasure {
        id: string
        el: HTMLElement
        naturalTop: number
        naturalY: number // anchor point (top + ANCHOR_OFFSET_PX)
        height: number
        columnId: string
        inLineage: boolean
        headerBottom: number
      }

      // Measure every card in every column that has at least one lineage
      // card. We need non-lineage cards to compute push-down offsets.
      const allMeasures = new Map<string, CardMeasure>()
      const columnCards = new Map<string, CardMeasure[]>()
      const columnsWithLineage = new Set<string>()

      // First, identify which columns have lineage cards.
      for (const id of lineage) {
        const el = findCardElement(container, id)
        if (!el) continue
        const col = el.closest('[data-column-id]')
        if (col) columnsWithLineage.add(col.getAttribute('data-column-id') ?? '')
      }

      // Measure all cards in those columns.
      for (const colId of columnsWithLineage) {
        const colEl = container.querySelector(`[data-column-id="${CSS.escape(colId)}"]`)
        if (!colEl) continue
        const hdrBottom = columnHeaderBottom(colEl)
        const cardEls = colEl.querySelectorAll<HTMLElement>('[data-card-id]')
        const cards: CardMeasure[] = []
        for (const el of cardEls) {
          const id = el.getAttribute('data-card-id') ?? ''
          const top = absoluteTop(el)
          const h = el.offsetHeight
          const m: CardMeasure = {
            id,
            el,
            naturalTop: top,
            naturalY: top + ANCHOR_OFFSET_PX,
            height: h,
            columnId: colId,
            inLineage: lineage.has(id),
            headerBottom: hdrBottom,
          }
          allMeasures.set(id, m)
          cards.push(m)
        }
        // Sort by natural position.
        cards.sort((a, b) => a.naturalTop - b.naturalTop)
        columnCards.set(colId, cards)
      }

      const focusedM = allMeasures.get(focusedCardId)
      if (!focusedM) {
        if (offsets.size !== 0) {
          lastSigRef.current = ''
          setOffsets(new Map())
        }
        return
      }

      // ── Step 2: compute lineage alignment offsets ──────────────

      const rawOffset = new Map<string, number>()
      rawOffset.set(focusedCardId, 0)

      // BFS upstream: ancestors align to focused card's Y center.
      const visited = new Set<string>([focusedCardId])
      const queue: string[] = [focusedCardId]
      while (queue.length > 0) {
        const current = queue.shift()!
        for (const parentId of parents.get(current) ?? []) {
          if (visited.has(parentId)) continue
          visited.add(parentId)
          const pm = allMeasures.get(parentId)
          if (pm) rawOffset.set(parentId, focusedM.naturalY - pm.naturalY)
          queue.push(parentId)
        }
      }

      // BFS downstream: each child aligns its center to its direct
      // parent's post-offset center. Multiple children in the same
      // column stack vertically (first aligns, rest keep natural gaps).
      const dQueue: string[] = [focusedCardId]
      const dVisited = new Set<string>([focusedCardId])
      while (dQueue.length > 0) {
        const current = dQueue.shift()!
        const currentM = allMeasures.get(current)
        if (!currentM) continue
        const currentOffset = rawOffset.get(current) ?? 0
        const parentPostY = currentM.naturalY + currentOffset

        const childIds = (children.get(current) ?? []).filter(
          (id) => !dVisited.has(id) && allMeasures.has(id),
        )

        // Group by column for fan-out handling.
        const byColumn = new Map<string, string[]>()
        for (const cid of childIds) {
          const cm = allMeasures.get(cid)!
          const list = byColumn.get(cm.columnId)
          if (list) list.push(cid)
          else byColumn.set(cm.columnId, [cid])
        }

        for (const [, siblings] of byColumn) {
          siblings.sort(
            (a, b) => allMeasures.get(a)!.naturalTop - allMeasures.get(b)!.naturalTop,
          )
          // First child aligns its center to parent's post-offset center.
          const firstM = allMeasures.get(siblings[0])!
          const firstOffset = parentPostY - firstM.naturalY
          rawOffset.set(siblings[0], firstOffset)
          dVisited.add(siblings[0])
          dQueue.push(siblings[0])

          // Stack remaining siblings below, preserving natural spacing
          // between each consecutive pair (not from the first).
          for (let i = 1; i < siblings.length; i++) {
            const prevM = allMeasures.get(siblings[i - 1])!
            const sibM = allMeasures.get(siblings[i])!
            const prevOffset = rawOffset.get(siblings[i - 1])!
            // Natural gap between previous sibling's bottom and this one's top.
            const naturalGap =
              sibM.naturalTop - (prevM.naturalTop + prevM.height)
            // Place this sibling below the previous sibling's post-offset bottom.
            const prevBottom = prevM.naturalTop + prevOffset + prevM.height
            const sibOffset = prevBottom + naturalGap - sibM.naturalTop
            rawOffset.set(siblings[i], sibOffset)
            dVisited.add(siblings[i])
            dQueue.push(siblings[i])
          }
        }
      }

      // Lineage cards not reached by BFS get offset 0.
      for (const id of lineage) {
        if (!rawOffset.has(id) && allMeasures.has(id)) {
          rawOffset.set(id, 0)
        }
      }

      // ── Step 2b: resolve overlaps between lineage cards ────────
      // Different parents can fan out into the same column (e.g. two
      // Goals each pointing to Work items). Their children were
      // positioned independently and may overlap. Walk each column's
      // lineage cards top-to-bottom and push any that collide.
      const GAP = 8 // matches CSS gap-2
      for (const [, cards] of columnCards) {
        const colLineage = cards
          .filter((c) => c.inLineage && rawOffset.has(c.id))
          .map((c) => ({
            id: c.id,
            naturalTop: c.naturalTop,
            height: c.height,
            postTop: c.naturalTop + (rawOffset.get(c.id) ?? 0),
          }))
        colLineage.sort((a, b) => a.postTop - b.postTop)
        for (let i = 1; i < colLineage.length; i++) {
          const prev = colLineage[i - 1]
          const curr = colLineage[i]
          const prevBottom = prev.postTop + prev.height
          if (curr.postTop < prevBottom + GAP) {
            const newTop = prevBottom + GAP
            const newOffset = newTop - curr.naturalTop
            rawOffset.set(curr.id, newOffset)
            curr.postTop = newTop
          }
        }
      }

      // ── Step 3: header clamping (global shift) ─────────────────

      let globalShift = 0
      for (const [id, offset] of rawOffset) {
        const m = allMeasures.get(id)
        if (!m) continue
        const topIfAligned = m.naturalTop + offset + globalShift
        if (topIfAligned < m.headerBottom) {
          globalShift += m.headerBottom - topIfAligned
        }
      }

      // Apply global shift to all lineage offsets.
      for (const [id, offset] of rawOffset) {
        rawOffset.set(id, offset + globalShift)
      }

      // ── Step 4: push non-lineage cards to clear lineage cards ──

      const next = new Map<string, number>()

      // Copy lineage offsets into the result.
      for (const [id, offset] of rawOffset) {
        next.set(id, offset)
      }

      // For each affected column, collect the occupied zones from lineage
      // cards, then walk ALL cards in natural (DOM) order and push any
      // non-lineage card that would overlap a lineage zone.
      for (const [, cards] of columnCards) {
        // Build sorted list of lineage card occupied intervals.
        const lineageZones: { top: number; bottom: number }[] = []
        for (const c of cards) {
          if (!c.inLineage) continue
          const offset = rawOffset.get(c.id) ?? 0
          const top = c.naturalTop + offset
          lineageZones.push({ top, bottom: top + c.height })
        }
        lineageZones.sort((a, b) => a.top - b.top)

        // Walk cards in their natural DOM order. Track cumulative push so
        // that each non-lineage card's push cascades to subsequent ones.
        let cumulativePush = 0

        for (const c of cards) {
          if (c.inLineage) {
            // Lineage card is fixed — but reset cumulative push tracking
            // relative to this card's post-offset bottom so subsequent
            // non-lineage cards clear it.
            const offset = rawOffset.get(c.id) ?? 0
            const lineageBottom = c.naturalTop + offset + c.height
            // If the lineage card's bottom is below where the next natural
            // card would be (considering cumulative push), update push.
            const nextNaturalTop = c.naturalTop + c.height + GAP
            if (lineageBottom + GAP > nextNaturalTop + cumulativePush) {
              cumulativePush = lineageBottom + GAP - nextNaturalTop
            }
            continue
          }

          // Non-lineage card: check if it overlaps any lineage zone.
          // Find the minimum push needed to clear all lineage zones.
          let pushNeeded = cumulativePush
          for (const zone of lineageZones) {
            const pushedTop = c.naturalTop + pushNeeded
            const pushedBottom = pushedTop + c.height
            // Check overlap (with gap).
            if (pushedTop < zone.bottom + GAP && pushedBottom > zone.top - GAP) {
              // Push below this zone.
              pushNeeded = zone.bottom + GAP - c.naturalTop
            }
          }

          if (pushNeeded > 0) {
            next.set(c.id, pushNeeded)
            cumulativePush = pushNeeded
          }
        }
      }

      // Remove zero offsets to keep the map sparse.
      for (const [id, v] of next) {
        if (Math.abs(v) < 0.5) next.delete(id)
      }

      const sig = [...next.entries()]
        .map(([k, v]) => `${k}:${Math.round(v)}`)
        .join(',')
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig
        setOffsets(next)
      }
    }

    compute()
    let raf = 0
    if (focusedCardId && offsets.size === 0) {
      raf = requestAnimationFrame(compute)
    }

    const container = containerRef.current
    if (!container) {
      return () => {
        if (raf) cancelAnimationFrame(raf)
      }
    }

    function schedule() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(compute)
    }
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', schedule)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, focusedCardId, lineage, connections, arrowTick])

  return offsets
}

function absoluteTop(el: HTMLElement): number {
  let y = 0
  let current: HTMLElement | null = el
  while (current) {
    y += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return y
}

function columnHeaderBottom(colEl: Element): number {
  const header = colEl.querySelector(':scope > .sticky')
  if (!(header instanceof HTMLElement)) return 0
  return absoluteTop(header) + header.offsetHeight
}

function findCardElement(
  container: HTMLElement,
  id: string,
): HTMLElement | null {
  const node = container.querySelector(
    `[data-card-id="${CSS.escape(id)}"]`,
  )
  return node instanceof HTMLElement ? node : null
}
