import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { Connection } from '@/lib/strategy/types'
import { getTemplate as _getTemplate } from '@/lib/strategy/templates'

export interface ArrowGeometry {
  id: string
  d: string
  /** Source center (absolute, container-relative). */
  sx: number
  sy: number
  /** Target center. */
  tx: number
  ty: number
}

export const CORNER_RADIUS = 8

/**
 * Pure path builder for orthogonal connector routing. Exposed for unit tests.
 *
 * Source → Target runs: horizontal from the source, a vertical bend, then
 * horizontal into the target. Corners are rounded with a small quadratic
 * bezier (radius `corner`) for a cleaner look without sacrificing the
 * orthogonal read. This replaces the earlier cubic-bezier routing which
 * could wobble into non-monotonic S-curves once lineage alignment brought
 * parent and child cards close vertically.
 *
 * Guarantees:
 * - Both X and Y move strictly monotonically from `(sx, sy)` to `(tx, ty)`
 *   along the entire path.
 * - Falls back to a straight line when the endpoints are within 1px of
 *   the same Y (no bend needed, no degenerate corner math).
 * - Corner radius auto-shrinks if the available horizontal/vertical room
 *   is smaller than the requested radius.
 */
/**
 * @param laneOffset — pixel offset from the natural midX, used to spread
 *   arrows sharing the same column gap into separate visual lanes.
 */
export function buildOrthogonalPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  corner: number = CORNER_RADIUS,
  laneOffset: number = 0,
): string {
  // Snap to horizontal: anchor at target Y so all arrows arriving at
  // the same card converge at a consistent point.
  if (Math.abs(ty - sy) < 20) {
    return `M ${sx} ${ty} L ${tx} ${ty}`
  }
  const midX = (sx + tx) / 2 + laneOffset
  const halfDx = Math.min(Math.abs(midX - sx), Math.abs(tx - midX))
  const halfDy = Math.abs(ty - sy) / 2
  const r = Math.max(0, Math.min(corner, halfDx, halfDy))
  const dirY = ty > sy ? 1 : -1
  // Horizontal direction: +1 if target is right of source, -1 if left.
  const dirX = tx > sx ? 1 : -1
  return [
    `M ${sx} ${sy}`,
    `L ${midX - r * dirX} ${sy}`,
    `Q ${midX} ${sy} ${midX} ${sy + r * dirY}`,
    `L ${midX} ${ty - r * dirY}`,
    `Q ${midX} ${ty} ${midX + r * dirX} ${ty}`,
    `L ${tx} ${ty}`,
  ].join(' ')
}

/** Fixed offset from the card's top edge to the arrow anchor point.
 *  Used for both arrow endpoints and connection dot placement. */
export const ANCHOR_OFFSET_PX = 18

interface UseConnectionsOptions {
  /** Ref to the absolutely-positioned board container (scroll context). */
  containerRef: RefObject<HTMLElement | null>
  connections: Connection[]
  /** Hidden card IDs (e.g. filtered-out problem cards) — skip arrows to/from them. */
  hiddenCardIds?: Set<string>
  /** Monotonic tick incremented whenever card positions may have changed. */
  arrowTick: number
  /** Arrow direction. 'ltr' = source right edge → target left edge.
   *  'rtl' = source left edge → target right edge. Default 'ltr'. */
  direction?: 'ltr' | 'rtl'
}

/**
 * Measure DOM positions for each connection endpoint and return
 * absolute (container-local) SVG geometries. Recomputes when
 * `arrowTick` changes, container/window resizes, or scroll happens.
 */
function sameGeometry(a: ArrowGeometry[], b: ArrowGeometry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    if (
      x.id !== y.id ||
      x.d !== y.d ||
      x.sx !== y.sx ||
      x.sy !== y.sy ||
      x.tx !== y.tx ||
      x.ty !== y.ty
    ) {
      return false
    }
  }
  return true
}

export function useConnections({
  containerRef,
  connections,
  hiddenCardIds,
  arrowTick,
  direction = 'ltr',
}: UseConnectionsOptions): ArrowGeometry[] {
  const [geometries, setGeometries] = useState<ArrowGeometry[]>([])
  const lastGeomRef = useRef<ArrowGeometry[]>([])

  useLayoutEffect(() => {
    function compute() {
      const container = containerRef.current
      if (!container) {
        // Parent may not have attached its ref yet on first commit.
        // Retry on next animation frame; if still null, bail.
        return
      }
      const crect = container.getBoundingClientRect()
      const scrollLeft = container.scrollLeft
      const scrollTop = container.scrollTop
      // Build target-set signature per source card. Source cards with the
      // same set of targets share a group (color + lane). Multi-target
      // source cards form their own "shared" group.
      const sourceTargets = new Map<string, Set<string>>()
      for (const conn of connections) {
        if (hiddenCardIds?.has(conn.fromCardId) || hiddenCardIds?.has(conn.toCardId)) continue
        const set = sourceTargets.get(conn.fromCardId)
        if (set) set.add(conn.toCardId)
        else sourceTargets.set(conn.fromCardId, new Set([conn.toCardId]))
      }
      function targetSig(fromCardId: string): string {
        const targets = sourceTargets.get(fromCardId)
        if (!targets) return fromCardId
        return [...targets].sort().join(',')
      }

      // Measure all visible arrow endpoints first.
      interface RawArrow {
        id: string
        targetSig: string
        sx: number
        sy: number
        tx: number
        ty: number
      }
      const raw: RawArrow[] = []
      for (const conn of connections) {
        if (
          hiddenCardIds?.has(conn.fromCardId) ||
          hiddenCardIds?.has(conn.toCardId)
        ) {
          continue
        }
        const from = container.querySelector(
          `[data-card-id="${CSS.escape(conn.fromCardId)}"]`,
        )
        const to = container.querySelector(
          `[data-card-id="${CSS.escape(conn.toCardId)}"]`,
        )
        if (!(from instanceof HTMLElement) || !(to instanceof HTMLElement)) {
          continue
        }
        const fr = from.getBoundingClientRect()
        const tr = to.getBoundingClientRect()
        // LTR: source right edge → target left edge
        // RTL: source left edge → target right edge
        // Inset endpoints by DOT_INSET so arrows stop short of the
        // connection dots, letting the dots visually sit on top.
        const DOT_INSET = 6
        const isRtl = direction === 'rtl'
        const sxRaw = (isRtl ? fr.left : fr.right) - crect.left + scrollLeft
        const txRaw = (isRtl ? tr.right : tr.left) - crect.left + scrollLeft
        const insetDir = txRaw > sxRaw ? 1 : -1
        raw.push({
          id: conn.id,
          targetSig: targetSig(conn.fromCardId),
          sx: sxRaw + DOT_INSET * insetDir,
          sy: fr.top + ANCHOR_OFFSET_PX - crect.top + scrollTop,
          tx: txRaw - DOT_INSET * insetDir,
          ty: tr.top + ANCHOR_OFFSET_PX - crect.top + scrollTop,
        })
      }

      // Sort by target-set signature so each group's arrows are together,
      // then by source Y within each group.
      raw.sort((a, b) =>
        a.targetSig.localeCompare(b.targetSig) || a.sy - b.sy || a.ty - b.ty,
      )

      // Assign lane offsets per target-set group within each column gap.
      // Single-target groups sort by target Y. Multi-target (shared) groups
      // slot between their constituent single-target groups.
      const LANE_SPACING = 5
      const MAX_SPREAD_RATIO = 0.5
      const gapKey = (a: RawArrow) =>
        `${Math.round(a.sx / 10)}_${Math.round(a.tx / 10)}`
      const gapGroups = new Map<string, RawArrow[]>()
      for (const a of raw) {
        const k = gapKey(a)
        const list = gapGroups.get(k)
        if (list) list.push(a)
        else gapGroups.set(k, [a])
      }
      const laneOffsets = new Map<string, number>()
      for (const [, group] of gapGroups) {
        const sigs = [...new Set(group.map((a) => a.targetSig))]

        // Compute a sort key per sig: single-target sigs use their
        // target Y directly; multi-target sigs use the average of their
        // constituent single-target Y positions so they slot between.
        const sigSortKey = new Map<string, number>()
        // First pass: single-target sigs.
        for (const sig of sigs) {
          if (!sig.includes(',')) {
            const arrow = group.find((a) => a.targetSig === sig)!
            sigSortKey.set(sig, arrow.ty)
          }
        }
        // Second pass: multi-target sigs get average of their targets' keys.
        for (const sig of sigs) {
          if (!sig.includes(',')) continue
          const targets = sig.split(',')
          let sum = 0
          let count = 0
          for (const t of targets) {
            // Find the single-target sig that is just this target ID.
            if (sigSortKey.has(t)) {
              sum += sigSortKey.get(t)!
              count++
            } else {
              // Target might not have its own single-target group;
              // use the actual target Y from any arrow pointing to it.
              const arrow = group.find((a) => a.ty && a.targetSig.includes(t))
              if (arrow) { sum += arrow.ty; count++ }
            }
          }
          sigSortKey.set(sig, count > 0 ? sum / count : 0)
        }

        sigs.sort((a, b) => (sigSortKey.get(a) ?? 0) - (sigSortKey.get(b) ?? 0))

        if (sigs.length <= 1) {
          for (const a of group) laneOffsets.set(a.id, 0)
          continue
        }
        const gapWidth = Math.abs(group[0].tx - group[0].sx)
        const maxSpread = gapWidth * MAX_SPREAD_RATIO
        const spacing = Math.min(
          LANE_SPACING,
          maxSpread / Math.max(sigs.length - 1, 1),
        )
        const halfSpan = ((sigs.length - 1) * spacing) / 2
        for (let i = 0; i < sigs.length; i++) {
          const offset = i * spacing - halfSpan
          for (const a of group) {
            if (a.targetSig === sigs[i]) {
              laneOffsets.set(a.id, offset)
            }
          }
        }
      }

      const next: ArrowGeometry[] = raw.map((a) => ({
        id: a.id,
        d: buildOrthogonalPath(
          a.sx, a.sy, a.tx, a.ty,
          CORNER_RADIUS,
          laneOffsets.get(a.id) ?? 0,
        ),
        sx: a.sx,
        sy: a.sy,
        tx: a.tx,
        ty: a.ty,
      }))
      if (!sameGeometry(lastGeomRef.current, next)) {
        lastGeomRef.current = next
        setGeometries(next)
      }
    }

    // Initial compute after layout; retry once on next frame if the parent's
    // ref hasn't been attached yet (child layout effects can race parent
    // ref assignment in React 18).
    compute()
    let initialRaf = 0
    if (!containerRef.current) {
      initialRaf = requestAnimationFrame(() => {
        compute()
      })
    }

    const container = containerRef.current
    if (!container) {
      return () => {
        if (initialRaf) cancelAnimationFrame(initialRaf)
      }
    }

    // Re-measure on resize (window and the container itself).
    let raf = 0
    function schedule() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(compute)
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(container)
    Array.from(container.querySelectorAll<HTMLElement>('[data-card-id]')).forEach(
      (el) => ro.observe(el),
    )
    window.addEventListener('resize', schedule)
    container.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', schedule)
      container.removeEventListener('scroll', schedule)
    }
    // hiddenCardIds is stable via useMemo at call site; depend on its ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, connections, arrowTick, hiddenCardIds, direction])

  return geometries
}

/** Build the hidden-card ID set from column filter state. */
export function useHiddenCardIds(
  cards: { id: string; columnId: string; fields: unknown }[],
  templateId: string,
  columnFilters: Record<string, string>,
) {
  return useMemo(() => {
    const template = _getTemplate(templateId as any)
    const set = new Set<string>()
    for (const c of cards) {
      const colDef = template.columns.find((col) => col.id === c.columnId)
      if (!colDef?.filter) continue
      const filterValue = columnFilters[c.columnId] ?? colDef.filter.defaultValue
      if (!colDef.filter.isVisible(c.fields as any, filterValue)) {
        set.add(c.id)
      }
    }
    return set
  }, [cards, templateId, columnFilters])
}
