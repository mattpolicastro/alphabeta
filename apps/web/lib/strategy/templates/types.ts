import type { ComponentType } from 'react'
import type { BoardState, CardFields, TemplateId } from '@/lib/strategy/types'

/**
 * Props that every card body component receives. The specific card component
 * narrows `fields` to its own field interface internally.
 */
export interface CardComponentProps {
  fields: CardFields
  editing: boolean
  onDraft: (next: CardFields) => void
  onToggleDone?: () => void
  onToggleMilestone?: (id: string) => void
}

/**
 * Optional per-column filter configuration. When present, the ColumnHeader
 * renders a filter dropdown and CardList uses `isVisible` to filter cards.
 */
export interface ColumnFilterDefinition {
  label: string
  options: { value: string; label: string }[]
  defaultValue: string
  isVisible: (fields: CardFields, filterValue: string) => boolean
}

/**
 * Definition of a single column within a template.
 */
export interface ColumnDefinition {
  id: string
  title: string
  subtitle: string
  bgClass: string
  /** ID of the adjacent-right column for connections, or null for the last column. */
  nextColumn: string | null
  /** Factory to create blank card fields for a new card in this column. */
  blankFields: () => CardFields
  /** React component to render the card body (display + edit modes). */
  cardComponent: ComponentType<CardComponentProps>
  /** Optional filter UI for this column. */
  filter?: ColumnFilterDefinition
}

/**
 * A complete framework template definition. The template registry maps
 * TemplateId → TemplateDefinition.
 */
export interface TemplateDefinition {
  id: TemplateId
  name: string
  shortName: string
  description: string
  /** Arrow/connection direction. Default 'ltr' (left-to-right). */
  direction?: 'ltr' | 'rtl'
  columns: ColumnDefinition[]
  /** Lazy factory for example board data (loaded on demand). */
  exampleBoard: () => BoardState
}
