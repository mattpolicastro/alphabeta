import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getColumnOrder } from '@/lib/strategy/templates'
import { Column } from './Column'
import { ConnectionLayer } from './ConnectionLayer'
import { DragConnectLayer } from './DragConnectLayer'
import { useBoard, useLineageSet } from '@/components/strategy/hooks/useBoardState'
import { useLineageAlignment } from '@/components/strategy/hooks/useLineageAlignment'
import { LineageAlignmentContext } from '@/components/strategy/hooks/LineageAlignmentContext'

export function Board() {
  const ref = useRef<HTMLDivElement>(null)
  const { state, dispatch } = useBoard()
  const columnOrder = useMemo(
    () => getColumnOrder(state.templateId),
    [state.templateId],
  )
  // Align the full lineage (ancestors + descendants) so arrows between
  // connected cards stay horizontal.
  const lineage = useLineageSet()
  const offsets = useLineageAlignment({
    containerRef: ref,
    focusedCardId: state.ui.focusedCardId,
    lineage,
    connections: state.connections,
    arrowTick: state.ui.arrowTick,
  })

  // Delay delivering offsets to CardShells so arrows can fade out (200ms)
  // before cards start moving. This creates the sequence:
  //   1. Arrows fade out (200ms)
  //   2. Cards slide to new positions (200ms CSS transition)
  //   3. Arrows fade in at new positions (200ms)
  const ARROW_FADE_MS = 200
  const [delayedOffsets, setDelayedOffsets] = useState(offsets)
  const firstOffsetsRef = useRef(true)

  useEffect(() => {
    if (firstOffsetsRef.current) {
      firstOffsetsRef.current = false
      setDelayedOffsets(offsets)
      return
    }
    const timer = setTimeout(() => {
      setDelayedOffsets(offsets)
    }, ARROW_FADE_MS)
    return () => clearTimeout(timer)
  }, [offsets])

  // After delayed offsets commit (cards move), bump arrowTick so arrows
  // re-measure at the new card positions. The second bump catches the
  // end of the card CSS transition.
  const prevDelayedRef = useRef(delayedOffsets)
  useLayoutEffect(() => {
    if (delayedOffsets === prevDelayedRef.current) return
    prevDelayedRef.current = delayedOffsets
    dispatch({ type: 'BUMP_ARROW_TICK' })
    const timer = setTimeout(() => dispatch({ type: 'BUMP_ARROW_TICK' }), 220)
    return () => clearTimeout(timer)
  }, [delayedOffsets, dispatch])

  function handleBoardClick(e: React.MouseEvent<HTMLDivElement>) {
    // Click-outside-card → clear focus and deselect any selected connection.
    const target = e.target as HTMLElement
    if (target.closest('[data-card-id]')) return
    if (target.closest('[data-connection-id]')) return
    if (target.closest('[data-connection-delete]')) return
    if (state.ui.focusedCardId) dispatch({ type: 'CLEAR_FOCUS' })
    if (state.ui.selectedConnectionId) {
      dispatch({ type: 'SELECT_CONNECTION', id: null })
    }
  }

  return (
    <div
      ref={ref}
      data-board-root
      onClick={handleBoardClick}
      className="relative flex min-h-full w-full flex-1 gap-6 overflow-auto p-4"
    >
      <LineageAlignmentContext.Provider value={delayedOffsets}>
        {columnOrder.map((id) => (
          <Column key={id} columnId={id} />
        ))}
        <ConnectionLayer containerRef={ref} />
        <DragConnectLayer containerRef={ref} />
      </LineageAlignmentContext.Provider>
    </div>
  )
}
