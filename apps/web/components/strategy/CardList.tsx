import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useMemo } from 'react'
import type { ColumnId } from '@/lib/strategy/types'
import { useBoard, useColumnCards } from '@/components/strategy/hooks/useBoardState'
import { getColumnDef } from '@/lib/strategy/templates'
import { SortableCard } from './SortableCard'

interface CardListProps {
  columnId: ColumnId
}

export function CardList({ columnId }: CardListProps) {
  const { state, dispatch } = useBoard()
  const cards = useColumnCards(columnId)

  const visible = useMemo(() => {
    const colDef = getColumnDef(state.templateId, columnId)
    const filterDef = colDef?.filter
    if (!filterDef) return cards
    const filterValue = state.ui.columnFilters[columnId] ?? filterDef.defaultValue
    return cards.filter((card) => filterDef.isVisible(card.fields, filterValue))
  }, [cards, state.ui.columnFilters, columnId, state.templateId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = cards.map((c) => c.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(ids, oldIndex, newIndex)
    dispatch({
      type: 'REORDER_CARDS',
      columnId,
      orderedIds: reordered,
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visible.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="flex flex-col gap-2 px-3 pb-3 pt-2"
          data-column-body={columnId}
        >
          {visible.map((card) => (
            <div key={card.id} className="group">
              <SortableCard card={card} />
            </div>
          ))}
          {visible.length === 0 && cards.length > 0 ? (
            <p className="px-1 text-[11px] italic text-gray-400">
              No cards match the current filter.
            </p>
          ) : null}
        </div>
      </SortableContext>
    </DndContext>
  )
}
