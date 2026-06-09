import type { ColumnId, Milestone } from '@/lib/strategy/types'
import { uuid } from '@/lib/uuid'
import { useBoard } from '@/components/strategy/hooks/useBoardState'
import { getColumnDef } from '@/lib/strategy/templates'
import { CardList } from './CardList'
import { ColumnHeader } from './ColumnHeader'

interface ColumnProps {
  columnId: ColumnId
}

export function Column({ columnId }: ColumnProps) {
  const { state, dispatch } = useBoard()
  const colDef = getColumnDef(state.templateId, columnId)
  const hasUnsavedCard = state.cards.some(
    (c) => c.columnId === columnId && !c.saved,
  )

  if (!colDef) return null

  function handleAddCard() {
    if (hasUnsavedCard) return
    dispatch({
      type: 'ADD_CARD',
      id: uuid(),
      columnId,
      fields: colDef!.blankFields(),
    })
  }

  return (
    <section
      aria-label={`${columnId} column`}
      className={`isolate flex min-h-full min-w-0 flex-1 flex-col self-stretch rounded-md ${colDef.bgClass}`}
      data-column-id={columnId}
    >
      <ColumnHeader
        columnId={columnId}
        onAddCard={handleAddCard}
        addDisabled={hasUnsavedCard}
        bgClass={colDef.bgClass}
      />
      <CardList columnId={columnId} />
    </section>
  )
}

export function makeMilestone(label = ''): Milestone {
  return { id: uuid(), label, done: false }
}
