import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import type { Card, CardFields, ColumnId } from '@/lib/strategy/types'
import { useBoard, useLineageSet } from '@/components/strategy/hooks/useBoardState'
import { useLineageOffset } from '@/components/strategy/hooks/LineageAlignmentContext'
import { getColumnDef, getTemplate } from '@/lib/strategy/templates'
import { ANCHOR_OFFSET_PX } from '@/components/strategy/hooks/useConnections'
import { mintDraft } from '@/lib/bet/queries'

interface CardShellProps {
  /** May be passed either as an initial snapshot or used only as an ID hint. */
  card: Card
}

export function CardShell({ card: initialCard }: CardShellProps) {
  const router = useRouter()
  const { state, dispatch } = useBoard()
  // Always read the canonical card from state so updates flow through.
  // If the card has been removed from state, hide ourselves.
  const fromState = state.cards.find((c) => c.id === initialCard.id)
  const card = fromState ?? initialCard
  const stillPresent = !!fromState
  const { connectSource } = state.ui
  const inConnectMode = connectSource !== null && connectSource !== card.id
  const isConnectSource = connectSource === card.id
  const connectTarget = useMemo(() => {
    if (!inConnectMode) return false
    const source = state.cards.find((c) => c.id === connectSource)
    if (!source) return false
    const colDef = getColumnDef(state.templateId, source.columnId)
    return colDef?.nextColumn === card.columnId
  }, [inConnectMode, connectSource, state.cards, card.columnId, state.templateId])

  const hasOutgoing = useMemo(
    () => state.connections.some((c) => c.fromCardId === card.id),
    [state.connections, card.id],
  )

  // Focus mode (lineage highlighting + alignment)
  const lineage = useLineageSet()
  const focusedCardId = state.ui.focusedCardId
  const isFocused = focusedCardId === card.id
  const focusActive = focusedCardId !== null
  const inLineage = focusActive && lineage.has(card.id)
  const offsetY = useLineageOffset(card.id)
  const canConnect = getColumnDef(state.templateId, card.columnId)?.nextColumn != null

  // Edit-mode lifecycle
  const [editing, setEditing] = useState(!card.saved)
  const [draft, setDraft] = useState<CardFields>(card.fields)

  // Keep the draft in sync when external updates arrive (and we're not editing)
  useEffect(() => {
    if (!editing) setDraft(card.fields)
  }, [card.fields, editing])

  const commitDraft = useCallback(() => {
    dispatch({ type: 'UPDATE_CARD', id: card.id, fields: draft })
    dispatch({ type: 'SAVE_CARD', id: card.id })
    setEditing(false)
  }, [dispatch, card.id, draft])

  const cancelDraft = useCallback(() => {
    if (!card.saved) {
      dispatch({ type: 'DELETE_CARD', id: card.id })
    } else {
      setDraft(card.fields)
      setEditing(false)
    }
  }, [card.saved, card.fields, card.id, dispatch])

  // Escape cancels an edit locally (higher-priority than connect-mode escape)
  useEffect(() => {
    if (!editing) return
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null
        if (target?.closest(`[data-card-id="${card.id}"]`)) {
          e.stopPropagation()
          cancelDraft()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [editing, card.id, cancelDraft])

  function handleClickCard(e: MouseEvent<HTMLDivElement>) {
    if (inConnectMode && connectTarget) {
      dispatch({
        type: 'ADD_CONNECTION',
        id: crypto.randomUUID(),
        fromCardId: connectSource!,
        toCardId: card.id,
      })
      return
    }
    if (editing) return
    // Ignore clicks that originated inside an interactive descendant
    // (toolbar button, form field, checkbox). Those handle their own action.
    const target = e.target as HTMLElement
    if (target.closest('button, input, textarea, select, a')) return
    if (isFocused) {
      dispatch({ type: 'CLEAR_FOCUS' })
    } else {
      dispatch({ type: 'FOCUS_CARD', id: card.id })
    }
  }

  function handleKeyCard(e: KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && inConnectMode && connectTarget) {
      e.preventDefault()
      // Emit a synthetic click via the dispatch path.
      dispatch({
        type: 'ADD_CONNECTION',
        id: crypto.randomUUID(),
        fromCardId: connectSource!,
        toCardId: card.id,
      })
    }
  }

  function handleToggleDone() {
    if (card.fields.columnId !== 'work') return
    const next: CardFields = { ...card.fields, done: !card.fields.done }
    dispatch({ type: 'UPDATE_CARD', id: card.id, fields: next })
  }

  async function handleElevateToBet() {
    if (!card.saved) return
    try {
      const bet = await mintDraft({}, { cardId: card.id })
      router.push(`/bet/wager?id=${bet.id}`)
    } catch (err) {
      console.error('Failed to elevate card to bet:', err)
    }
  }

  function handleToggleMilestone(milestoneId: string) {
    if (card.fields.columnId !== 'goals') return
    if (card.fields.mode !== 'milestones') return
    const next: CardFields = {
      ...card.fields,
      milestones: (card.fields.milestones ?? []).map((m) =>
        m.id === milestoneId ? { ...m, done: !m.done } : m,
      ),
    }
    dispatch({ type: 'UPDATE_CARD', id: card.id, fields: next })
  }

  if (!stillPresent) return null

  const filterValue = state.ui.columnFilters[card.columnId] ?? 'all'
  const isFiltered = isColumnFilteredOut(state.templateId, card, filterValue)
  const body = renderCardBody({
    card,
    templateId: state.templateId,
    editing,
    draft,
    setDraft,
    handleToggleDone,
    handleToggleMilestone,
  })

  return (
    <div
      data-card-id={card.id}
      data-card-saved={card.saved ? 'true' : 'false'}
      onClick={handleClickCard}
      onKeyDown={handleKeyCard}
      role={inConnectMode && connectTarget ? 'button' : undefined}
      tabIndex={inConnectMode && connectTarget ? 0 : -1}
      style={{
        transform: offsetY
          ? `translateY(${offsetY}px)`
          : undefined,
        transition:
          'transform 200ms ease, opacity 200ms ease, filter 200ms ease',
        // Lineage cards render above non-lineage; all moved cards render
        // above unmoved siblings to prevent clipping during transforms.
        zIndex: inLineage ? 2 : offsetY ? 1 : undefined,
      }}
      className={[
        'group relative rounded-md border bg-white px-3 py-2 shadow-sm',
        'border-gray-200',
        isConnectSource ? 'ring-2 ring-offset-1 ring-sky-400' : '',
        inConnectMode && connectTarget
          ? 'cursor-pointer ring-2 ring-offset-1 ring-emerald-400'
          : '',
        isFiltered ? 'opacity-60' : '',
        isFocused ? 'ring-2 ring-offset-1 ring-rose-300' : '',
        focusActive && !inLineage
          ? 'cursor-pointer opacity-30 grayscale'
          : focusActive && !isFocused
            ? 'cursor-pointer'
            : !focusActive
              ? 'cursor-pointer'
              : '',
      ].join(' ')}
    >
      {(hasOutgoing || canConnect) ? (
        <ConnectionDot
          side={getTemplate(state.templateId).direction === 'rtl' ? 'left' : 'right'}
          topPx={ANCHOR_OFFSET_PX}
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            e.preventDefault() // prevent text selection during drag
            const el = e.currentTarget as HTMLElement
            const rect = el.getBoundingClientRect()
            el.closest('[data-board-root]')?.dispatchEvent(
              new CustomEvent('drag-connect-start', {
                bubbles: false,
                detail: {
                  cardId: card.id,
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top + rect.height / 2,
                },
              }),
            )
          }}
        />
      ) : null}
      {!editing ? (
        <CardToolbar
          onEdit={() => setEditing(true)}
          onDelete={() => dispatch({ type: 'DELETE_CARD', id: card.id })}
          onElevate={card.saved ? handleElevateToBet : undefined}
        />
      ) : null}
      {card.collapsed && !editing ? (
        <CollapsedCardBody card={card} />
      ) : (
        body
      )}
      {editing ? (
        <div className="mt-2 flex justify-end gap-1.5">
          <button
            type="button"
            onClick={cancelDraft}
            className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50"
          >
            {card.saved ? 'Cancel' : 'Discard'}
          </button>
          <button
            type="button"
            onClick={commitDraft}
            className="rounded bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      ) : null}
    </div>
  )
}

function renderCardBody({
  card,
  templateId,
  editing,
  draft,
  setDraft,
  handleToggleDone,
  handleToggleMilestone,
}: {
  card: Card
  templateId: string
  editing: boolean
  draft: CardFields
  setDraft: (next: CardFields) => void
  handleToggleDone: () => void
  handleToggleMilestone: (id: string) => void
}) {
  const effective = editing ? draft : card.fields
  const colDef = getColumnDef(templateId as any, card.columnId)
  if (!colDef) return null
  const Component = colDef.cardComponent
  return (
    <Component
      fields={effective}
      editing={editing}
      onDraft={setDraft}
      onToggleDone={editing ? undefined : handleToggleDone}
      onToggleMilestone={editing ? undefined : handleToggleMilestone}
    />
  )
}

/** Exported for tests. */
export function isColumnFilteredOut(
  templateId: string,
  card: Card,
  filter: string,
): boolean {
  const colDef = getColumnDef(templateId as any, card.columnId)
  if (!colDef?.filter) return false
  return !colDef.filter.isVisible(card.fields, filter)
}

/** @deprecated Use isColumnFilteredOut. Kept for backward compat in tests. */
export function isProblemFilteredOut(
  card: Card,
  filter: string,
): boolean {
  return isColumnFilteredOut('nsf', card, filter)
}

function ConnectionDot({
  side,
  topPx,
  draggable,
  onDragStart,
}: {
  side: 'left' | 'right'
  topPx?: number
  draggable?: boolean
  onDragStart?: (e: React.MouseEvent) => void
}) {
  if (draggable) {
    return (
      <span
        aria-label="Drag to connect"
        role="button"
        onMouseDown={onDragStart}
        style={{ top: topPx ?? 16 }}
        className={`pointer-events-auto absolute flex h-6 w-6 -translate-y-1/2 items-center justify-center cursor-crosshair group/dot ${
          side === 'left' ? '-left-3' : '-right-3'
        }`}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-gray-400 transition-all group-hover/dot:h-4 group-hover/dot:w-4 group-hover/dot:bg-gray-700" />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      style={{ top: topPx ?? 16 }}
      className={`pointer-events-none absolute h-2 w-2 -translate-y-1/2 rounded-full bg-gray-400 ${
        side === 'left' ? '-left-1' : '-right-1'
      }`}
    />
  )
}

function CardToolbar({
  onEdit,
  onDelete,
  onElevate,
}: {
  onEdit: () => void
  onDelete: () => void
  onElevate?: () => void
}) {
  return (
    <div className="absolute bottom-1 right-1 flex gap-0.5 rounded border border-gray-200 bg-white/95 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition focus-within:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100">
      {onElevate ? (
        <IconBtn label="Elevate to bet" onClick={onElevate} char="↗" />
      ) : null}
      <IconBtn label="Edit" onClick={onEdit} char="✎" />
      <IconBtn label="Delete" onClick={onDelete} char="🗑" />
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  char,
}: {
  label: string
  onClick: () => void
  char: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="rounded px-1 text-[11px] leading-none text-gray-500 hover:bg-black/10 hover:text-gray-800"
    >
      {char}
    </button>
  )
}

function CollapsedCardBody({ card }: { card: Card }) {
  const title = collapsedTitle(card)
  return (
    <p className="truncate text-sm font-medium text-gray-700">
      {title || <span className="italic text-gray-400">Untitled</span>}
    </p>
  )
}

function collapsedTitle(card: Card): string {
  const f = card.fields as unknown as Record<string, unknown>
  return (
    (typeof f.title === 'string' ? f.title : '') ||
    (typeof f.description === 'string' ? f.description : '') ||
    ''
  )
}

/** Helper exported for tests. */
export function _cardShellColumn(columnId: ColumnId): ColumnId {
  return columnId
}
