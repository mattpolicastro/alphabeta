import type { BoardState, ColumnMeta, TemplateId } from '@/lib/strategy/types'
import { getTemplate, getColumnConfig as _getColumnConfig } from '@/lib/strategy/templates'

// ---------------------------------------------------------------------------
// Backward-compatible exports derived from the NSF template.
// Phase 2 will remove most of these once components read from the registry.
// ---------------------------------------------------------------------------

const nsf = getTemplate('nsf')

export const COLUMN_ORDER: readonly string[] = nsf.columns.map((c) => c.id)

export interface ColumnConfig {
  id: string
  bgClass: string
  nextColumn: string | null
}

export const COLUMN_CONFIG: Record<string, ColumnConfig> = Object.fromEntries(
  nsf.columns.map((c) => [
    c.id,
    { id: c.id, bgClass: c.bgClass, nextColumn: c.nextColumn },
  ]),
)

export const DEFAULT_COLUMN_META: Record<string, ColumnMeta> = Object.fromEntries(
  nsf.columns.map((c) => [c.id, { title: c.title, subtitle: c.subtitle }]),
)

export const DEFAULT_CYCLE_NAME = 'Current cycle'

export function defaultBoardState(templateId: TemplateId = 'nsf'): BoardState {
  const template = getTemplate(templateId)
  return {
    templateId,
    cycleName: DEFAULT_CYCLE_NAME,
    columnMeta: Object.fromEntries(
      template.columns.map((c) => [
        c.id,
        { title: c.title, subtitle: c.subtitle },
      ]),
    ),
    cards: [],
    connections: [],
  }
}

// Re-export example board from NSF template
export const EXAMPLE_BOARD: BoardState = nsf.exampleBoard()
