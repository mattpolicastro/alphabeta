import type { ColumnId } from '@/lib/strategy/types'
import { useBoard } from '@/components/strategy/hooks/useBoardState'
import { getColumnDef } from '@/lib/strategy/templates'
import { InlineEdit } from './InlineEdit'

interface ColumnHeaderProps {
  columnId: ColumnId
  onAddCard: () => void
  /**
   * Matches the column's pastel background. Rendered on the sticky header
   * itself so that a lineage-aligned ancestor card translating upward
   * visually slides behind the header instead of covering the title.
   */
  bgClass: string
  /** Grey out the Add button when the column already has an unsaved card. */
  addDisabled?: boolean
}

export function ColumnHeader({
  columnId,
  onAddCard,
  bgClass,
  addDisabled = false,
}: ColumnHeaderProps) {
  const { state, dispatch } = useBoard()
  const meta = state.columnMeta[columnId]
  const colDef = getColumnDef(state.templateId, columnId)
  const filterDef = colDef?.filter
  return (
    // sticky + z-20 + matching pastel bg keeps the header visible when the
    // board scrolls vertically AND makes sure a focus-aligned ancestor card
    // (which renders at z-index 2 via transform) never draws on top of the
    // title when it translates upward.
    <div
      className={`sticky top-0 z-20 flex flex-col gap-1 rounded-t-md px-3 pt-3 pb-1 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)] ${bgClass}`}
    >
      <div className="text-[11px] italic text-gray-400">
        <InlineEdit
          value={meta.subtitle}
          onCommit={(subtitle) =>
            dispatch({
              type: 'UPDATE_COLUMN_META',
              columnId,
              meta: { subtitle },
            })
          }
          ariaLabel={`${columnId} subtitle`}
          className="px-1"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <InlineEdit
          value={meta.title}
          onCommit={(title) =>
            dispatch({
              type: 'UPDATE_COLUMN_META',
              columnId,
              meta: { title },
            })
          }
          ariaLabel={`${columnId} title`}
          className="px-1 text-sm font-bold uppercase tracking-wide text-gray-800"
        />
        <div className="flex items-center gap-1">
          {filterDef ? (
            <select
              aria-label={filterDef.label}
              value={state.ui.columnFilters[columnId] ?? filterDef.defaultValue}
              onChange={(e) =>
                dispatch({
                  type: 'SET_COLUMN_FILTER',
                  columnId,
                  value: e.target.value,
                })
              }
              className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[11px] text-gray-700"
            >
              {filterDef.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onAddCard}
        disabled={addDisabled}
        aria-label={`Add card to ${columnId}`}
        title={addDisabled ? 'Finish the current card first' : undefined}
        className={`mt-1 self-start rounded-full border border-dashed px-2 py-0.5 text-xs transition ${
          addDisabled
            ? 'cursor-not-allowed border-gray-200 bg-white/20 text-gray-300'
            : 'border-gray-300 bg-white/40 text-gray-500 hover:border-gray-400 hover:text-gray-700'
        }`}
      >
        + Add
      </button>
    </div>
  )
}

