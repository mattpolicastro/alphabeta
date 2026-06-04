import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import type {
  BoardState,
  Card,
  CardFields,
  ColumnId,
  ColumnMeta,
} from '@/lib/strategy/types'
import {
  DEFAULT_COLUMN_META,
  DEFAULT_CYCLE_NAME,
  defaultBoardState,
} from '@/lib/strategy/constants'
import { getTemplate } from '@/lib/strategy/templates'
import { loadBoard, saveBoard } from '@/lib/strategy/utils/storage'
import { getAncestors, getLineage } from '@/lib/strategy/utils/lineage'

export const SAVE_DEBOUNCE_MS = 500

// ---------------------------------------------------------------------------
// Transient UI state (not persisted)
// ---------------------------------------------------------------------------

export interface TransientUIState {
  /** Per-column filter values (keyed by columnId). Only columns with a
   *  filter definition in the template use these. */
  columnFilters: Record<string, string>
  collapsedColumns: Record<string, boolean>
  /** Card ID that initiated connect mode, or null. */
  connectSource: string | null
  /** Monotonic counter the arrow layer can watch to force recompute. */
  arrowTick: number
  /** The currently selected connection ID (for delete-on-keypress). */
  selectedConnectionId: string | null
  importError: string | null
  /** Card ID in "focus mode" — its ancestors align to it; non-lineage cards desaturate. */
  focusedCardId: string | null
}

export interface FullBoardState extends BoardState {
  ui: TransientUIState
}

function buildInitialUI(templateId: string = 'nsf'): TransientUIState {
  const template = getTemplate(templateId as any)
  const columnFilters: Record<string, string> = {}
  const collapsedColumns: Record<string, boolean> = {}
  for (const col of template.columns) {
    collapsedColumns[col.id] = false
    if (col.filter) {
      columnFilters[col.id] = col.filter.defaultValue
    }
  }
  return {
    columnFilters,
    collapsedColumns,
    connectSource: null,
    arrowTick: 0,
    selectedConnectionId: null,
    importError: null,
    focusedCardId: null,
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type BoardAction =
  | { type: 'ADD_CARD'; id: string; columnId: ColumnId; fields: CardFields }
  | { type: 'UPDATE_CARD'; id: string; fields: CardFields }
  | { type: 'SAVE_CARD'; id: string }
  | { type: 'DELETE_CARD'; id: string }
  | { type: 'TOGGLE_CARD_COLLAPSED'; id: string }
  | {
      type: 'REORDER_CARDS'
      columnId: ColumnId
      orderedIds: string[]
    }
  | {
      type: 'ADD_CONNECTION'
      id: string
      fromCardId: string
      toCardId: string
    }
  | { type: 'REMOVE_CONNECTION'; id: string }
  | { type: 'SELECT_CONNECTION'; id: string | null }
  | { type: 'TOGGLE_COLUMN_COLLAPSE'; columnId: ColumnId }
  | {
      type: 'UPDATE_COLUMN_META'
      columnId: ColumnId
      meta: Partial<ColumnMeta>
    }
  | { type: 'SET_CYCLE_NAME'; name: string }
  | { type: 'SET_COLUMN_FILTER'; columnId: string; value: string }
  | { type: 'ENTER_CONNECT_MODE'; cardId: string }
  | { type: 'EXIT_CONNECT_MODE' }
  | { type: 'BUMP_ARROW_TICK' }
  | { type: 'LOAD_BOARD'; state: BoardState }
  | { type: 'SET_IMPORT_ERROR'; error: string | null }
  | { type: 'FOCUS_CARD'; id: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'CLEAR_BOARD' }

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function reducer(state: FullBoardState, action: BoardAction): FullBoardState {
  switch (action.type) {
    case 'ADD_CARD': {
      // Guardrail: refuse to add another unsaved card while one already
      // exists in the column (prevents accidental double-clicks / keyboard
      // mashing from producing a stack of empty entries).
      if (
        state.cards.some(
          (c) => c.columnId === action.columnId && !c.saved,
        )
      ) {
        return state
      }
      const card: Card = {
        id: action.id,
        columnId: action.columnId,
        saved: false,
        collapsed: false,
        fields: action.fields,
      }
      // Insert the new card at the top of its column (right after the
      // header / Add button) so it's immediately visible even when the
      // column has scrolled off-screen.
      const firstIdx = state.cards.findIndex(
        (c) => c.columnId === action.columnId,
      )
      const nextCards =
        firstIdx === -1
          ? [...state.cards, card]
          : [
              ...state.cards.slice(0, firstIdx),
              card,
              ...state.cards.slice(firstIdx),
            ]
      return {
        ...state,
        cards: nextCards,
        ui: { ...state.ui, arrowTick: state.ui.arrowTick + 1 },
      }
    }
    case 'UPDATE_CARD': {
      const idx = state.cards.findIndex((c) => c.id === action.id)
      if (idx === -1) return state
      const next = state.cards.slice()
      next[idx] = { ...next[idx], fields: action.fields }
      return { ...state, cards: next }
    }
    case 'SAVE_CARD': {
      const idx = state.cards.findIndex((c) => c.id === action.id)
      if (idx === -1 || state.cards[idx].saved) return state
      const next = state.cards.slice()
      next[idx] = { ...next[idx], saved: true }
      return { ...state, cards: next }
    }
    case 'DELETE_CARD': {
      if (!state.cards.some((c) => c.id === action.id)) return state
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.id),
        connections: state.connections.filter(
          (conn) =>
            conn.fromCardId !== action.id && conn.toCardId !== action.id,
        ),
        ui: {
          ...state.ui,
          arrowTick: state.ui.arrowTick + 1,
          connectSource:
            state.ui.connectSource === action.id
              ? null
              : state.ui.connectSource,
          focusedCardId:
            state.ui.focusedCardId === action.id
              ? null
              : state.ui.focusedCardId,
        },
      }
    }
    case 'TOGGLE_CARD_COLLAPSED': {
      const idx = state.cards.findIndex((c) => c.id === action.id)
      if (idx === -1) return state
      const next = state.cards.slice()
      next[idx] = { ...next[idx], collapsed: !next[idx].collapsed }
      return {
        ...state,
        cards: next,
        ui: { ...state.ui, arrowTick: state.ui.arrowTick + 1 },
      }
    }
    case 'REORDER_CARDS': {
      // Reorder only within the given column; other columns stay put.
      const inCol = state.cards.filter((c) => c.columnId === action.columnId)
      const inColMap = new Map(inCol.map((c) => [c.id, c]))
      const reordered = action.orderedIds
        .map((id) => inColMap.get(id))
        .filter((c): c is Card => !!c)
      if (reordered.length !== inCol.length) return state
      // Splice the reordered column back into the full cards array
      // preserving other columns' positions.
      const newCards: Card[] = []
      let readIdx = 0
      for (const card of state.cards) {
        if (card.columnId === action.columnId) {
          newCards.push(reordered[readIdx++])
        } else {
          newCards.push(card)
        }
      }
      return {
        ...state,
        cards: newCards,
        ui: { ...state.ui, arrowTick: state.ui.arrowTick + 1 },
      }
    }
    case 'ADD_CONNECTION': {
      // Deduplicate (same from/to)
      if (
        state.connections.some(
          (c) =>
            c.fromCardId === action.fromCardId &&
            c.toCardId === action.toCardId,
        )
      ) {
        return {
          ...state,
          ui: { ...state.ui, connectSource: null },
        }
      }
      return {
        ...state,
        connections: [
          ...state.connections,
          {
            id: action.id,
            fromCardId: action.fromCardId,
            toCardId: action.toCardId,
          },
        ],
        ui: {
          ...state.ui,
          connectSource: null,
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    }
    case 'REMOVE_CONNECTION': {
      if (!state.connections.some((c) => c.id === action.id)) return state
      return {
        ...state,
        connections: state.connections.filter((c) => c.id !== action.id),
        ui: {
          ...state.ui,
          selectedConnectionId:
            state.ui.selectedConnectionId === action.id
              ? null
              : state.ui.selectedConnectionId,
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    }
    case 'SELECT_CONNECTION':
      return {
        ...state,
        ui: { ...state.ui, selectedConnectionId: action.id },
      }
    case 'TOGGLE_COLUMN_COLLAPSE':
      return {
        ...state,
        ui: {
          ...state.ui,
          collapsedColumns: {
            ...state.ui.collapsedColumns,
            [action.columnId]: !state.ui.collapsedColumns[action.columnId],
          },
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    case 'UPDATE_COLUMN_META':
      return {
        ...state,
        columnMeta: {
          ...state.columnMeta,
          [action.columnId]: {
            ...state.columnMeta[action.columnId],
            ...action.meta,
          },
        },
      }
    case 'SET_CYCLE_NAME':
      return { ...state, cycleName: action.name }
    case 'SET_COLUMN_FILTER':
      return {
        ...state,
        ui: {
          ...state.ui,
          columnFilters: {
            ...state.ui.columnFilters,
            [action.columnId]: action.value,
          },
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    case 'ENTER_CONNECT_MODE':
      return { ...state, ui: { ...state.ui, connectSource: action.cardId } }
    case 'EXIT_CONNECT_MODE':
      return { ...state, ui: { ...state.ui, connectSource: null } }
    case 'BUMP_ARROW_TICK':
      return {
        ...state,
        ui: { ...state.ui, arrowTick: state.ui.arrowTick + 1 },
      }
    case 'LOAD_BOARD':
      return {
        ...action.state,
        ui: {
          ...buildInitialUI(action.state.templateId),
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    case 'SET_IMPORT_ERROR':
      return { ...state, ui: { ...state.ui, importError: action.error } }
    case 'FOCUS_CARD':
      // Focusing is mutually exclusive with connect mode and editing new cards.
      if (!state.cards.some((c) => c.id === action.id)) return state
      return {
        ...state,
        ui: {
          ...state.ui,
          focusedCardId: action.id,
          // Re-layout may shift cards; arrows need to re-measure.
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    case 'CLEAR_FOCUS':
      if (state.ui.focusedCardId === null) return state
      return {
        ...state,
        ui: {
          ...state.ui,
          focusedCardId: null,
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    case 'CLEAR_BOARD':
      return {
        ...state,
        cards: [],
        connections: [],
        ui: {
          ...buildInitialUI(state.templateId),
          arrowTick: state.ui.arrowTick + 1,
        },
      }
    default: {
      const _exhaustive: never = action
      void _exhaustive
      return state
    }
  }
}

// ---------------------------------------------------------------------------
// Context + provider hook
// ---------------------------------------------------------------------------

export interface BoardContextValue {
  state: FullBoardState
  dispatch: React.Dispatch<BoardAction>
}

export const BoardContext = createContext<BoardContextValue | null>(null)

export function createInitialState(
  override?: Partial<BoardState>,
): FullBoardState {
  const base = override
    ? {
        templateId: override.templateId ?? 'nsf' as const,
        cycleName: override.cycleName ?? DEFAULT_CYCLE_NAME,
        columnMeta: override.columnMeta ?? DEFAULT_COLUMN_META,
        cards: override.cards ?? [],
        connections: override.connections ?? [],
      }
    : defaultBoardState()
  return { ...base, ui: buildInitialUI(base.templateId) }
}

export interface UseBoardStateOptions {
  /** Disable localStorage hydration and persistence (used by tests). */
  disablePersistence?: boolean
  /** Override the initial state (used by tests). */
  initialState?: BoardState
}

export function useBoardState(options: UseBoardStateOptions = {}) {
  const { disablePersistence = false, initialState: initialOverride } = options
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    if (initialOverride) return createInitialState(initialOverride)
    if (disablePersistence) return createInitialState()
    return createInitialState(loadBoard())
  })

  // Debounced persistence.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastStateRef = useRef<BoardState | null>(null)
  useEffect(() => {
    if (disablePersistence) return
    const persistable: BoardState = {
      templateId: state.templateId,
      cycleName: state.cycleName,
      columnMeta: state.columnMeta,
      cards: state.cards,
      connections: state.connections,
    }
    lastStateRef.current = persistable
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (lastStateRef.current) saveBoard(lastStateRef.current)
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [
    disablePersistence,
    state.cycleName,
    state.columnMeta,
    state.cards,
    state.connections,
  ])

  const value = useMemo<BoardContextValue>(
    () => ({ state, dispatch }),
    [state],
  )
  return value
}

// ---------------------------------------------------------------------------
// Context consumer helpers
// ---------------------------------------------------------------------------

export function useBoard(): BoardContextValue {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoard must be used within a BoardProvider')
  return ctx
}

export function useBoardDispatch() {
  return useBoard().dispatch
}

/** Returns the cards for a given column, preserving insertion order. */
export function useColumnCards(columnId: ColumnId): Card[] {
  const { state } = useBoard()
  return useMemo(
    () => state.cards.filter((c) => c.columnId === columnId),
    [state.cards, columnId],
  )
}

/** Stable helper to look up a card by ID. */
export function useCard(id: string | null | undefined): Card | undefined {
  const { state } = useBoard()
  return useMemo(
    () => (id ? state.cards.find((c) => c.id === id) : undefined),
    [state.cards, id],
  )
}

/**
 * The full lineage set (focused card + ancestors + descendants) for the
 * current focus target. Used for desaturation — every card in this set stays
 * saturated. Returns an empty set when no card is focused.
 */
export function useLineageSet(): Set<string> {
  const { state } = useBoard()
  return useMemo(() => {
    if (!state.ui.focusedCardId) return new Set<string>()
    return getLineage(state.ui.focusedCardId, state.connections)
  }, [state.ui.focusedCardId, state.connections])
}

/**
 * Ancestors-only set (focused card + upstream). Used for vertical alignment
 * — only upstream cards need to shift to align with the focused card, since
 * descendants already sit to the right in their own columns.
 */
export function useAncestorsSet(): Set<string> {
  const { state } = useBoard()
  return useMemo(() => {
    if (!state.ui.focusedCardId) return new Set<string>()
    const set = getAncestors(state.ui.focusedCardId, state.connections)
    set.add(state.ui.focusedCardId)
    return set
  }, [state.ui.focusedCardId, state.connections])
}

/** Pure reducer export for testing. */
export const _reducerForTests = reducer

/** Wrap a partial BoardState into a FullBoardState for testing. */
export function _createFullStateForTests(
  partial: Partial<BoardState> = {},
  ui: Partial<TransientUIState> = {},
): FullBoardState {
  const base = createInitialState(partial)
  return { ...base, ui: { ...base.ui, ...ui } }
}
