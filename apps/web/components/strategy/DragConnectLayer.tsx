import { useEffect, useRef, useState, type RefObject } from 'react'
import { useBoard } from '@/components/strategy/hooks/useBoardState'
import { getColumnDef } from '@/lib/strategy/templates'

/**
 * Invisible overlay that handles drag-to-connect interactions.
 * When the user drags from an outgoing dot, a temporary SVG wire
 * follows the cursor. Releasing over an eligible card creates a connection.
 */
export function DragConnectLayer({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>
}) {
  const { state, dispatch } = useBoard()
  const wireRef = useRef<SVGLineElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<{
    sourceCardId: string
    startX: number
    startY: number
  } | null>(null)

  // Listen for custom 'drag-connect-start' events dispatched by the
  // outgoing connection handle on CardShell.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleStart(e: Event) {
      const detail = (e as CustomEvent).detail as {
        cardId: string
        clientX: number
        clientY: number
      }
      const crect = container!.getBoundingClientRect()
      setDragging({
        sourceCardId: detail.cardId,
        startX: detail.clientX - crect.left + container!.scrollLeft,
        startY: detail.clientY - crect.top + container!.scrollTop,
      })
      dispatch({ type: 'ENTER_CONNECT_MODE', cardId: detail.cardId })
    }

    container.addEventListener('drag-connect-start', handleStart)
    return () => container.removeEventListener('drag-connect-start', handleStart)
  }, [containerRef, dispatch])

  // Track mouse during drag — update wire endpoint directly via DOM ref.
  useEffect(() => {
    if (!dragging) return
    const container = containerRef.current
    if (!container) return

    function handleMove(e: MouseEvent) {
      const wire = wireRef.current
      if (!wire || !container) return
      const crect = container.getBoundingClientRect()
      wire.setAttribute(
        'x2',
        String(e.clientX - crect.left + container.scrollLeft),
      )
      wire.setAttribute(
        'y2',
        String(e.clientY - crect.top + container.scrollTop),
      )
    }

    function handleUp(e: MouseEvent) {
      // Find the card element under the cursor.
      const target = document.elementFromPoint(e.clientX, e.clientY)
      const cardEl = target?.closest('[data-card-id]')
      if (cardEl && dragging) {
        const targetCardId = cardEl.getAttribute('data-card-id')!
        if (targetCardId !== dragging.sourceCardId) {
          // Verify it's in the next column.
          const sourceCard = state.cards.find(
            (c) => c.id === dragging.sourceCardId,
          )
          if (sourceCard) {
            const colDef = getColumnDef(state.templateId, sourceCard.columnId)
            const targetCard = state.cards.find((c) => c.id === targetCardId)
            if (
              colDef?.nextColumn &&
              targetCard?.columnId === colDef.nextColumn
            ) {
              dispatch({
                type: 'ADD_CONNECTION',
                id: crypto.randomUUID(),
                fromCardId: dragging.sourceCardId,
                toCardId: targetCardId,
              })
            }
          }
        }
      }
      dispatch({ type: 'EXIT_CONNECT_MODE' })
      setDragging(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [dragging, containerRef, state.cards, state.templateId, dispatch])

  if (!dragging) return null

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ overflow: 'visible', zIndex: 40 }}
    >
      <line
        ref={wireRef}
        x1={dragging.startX}
        y1={dragging.startY}
        x2={dragging.startX}
        y2={dragging.startY}
        stroke="#999"
        strokeWidth={2}
        strokeDasharray="6 3"
      />
    </svg>
  )
}
