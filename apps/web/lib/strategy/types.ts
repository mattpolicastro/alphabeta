// Strategy layer types — ported from `~/Projects/nsf-board/src/types.ts`,
// narrowed to the NSF template for v1. Other framework unions (OKR, RICE,
// GIST, GPS) land in later sprints by extending CardFields + TemplateId.
//
// The shape mirrors Plinth Board's so the kanban scaffolding (Board,
// Column, CardShell, ConnectionLayer, useBoardState) ports without
// adaptation. Persistence in alphaBeta is Dexie-backed (lib/strategy/queries.ts)
// instead of Plinth's localStorage, but the in-memory shape is identical.

export type ColumnId = string;

export type TemplateId = "nsf"; // | "okr" | "rice" | "gist" | "gps" (later)

export type ImpactLevel = "high" | "medium" | "low";
export type EffortLevel = "XS" | "S" | "M" | "L" | "XL";
export type ProblemState = "active" | "prospect" | "pool";
export type ProblemFilter = "all" | ProblemState;
export type GoalMode = "value" | "milestones";

export interface NorthStarFields {
  title: string;
  measuredBy: string;
  startValue: string;
  startDate: string;
  goalValue: string;
  goalDate: string;
  hypothesis?: string;
  expectedImpact?: ImpactLevel;
  confidence?: ImpactLevel;
  effort?: EffortLevel;
  planningNotes?: string;
}

export interface DriverFields {
  title: string;
  measuredBy: string;
  startValue: string;
  goalValue: string;
  hypothesis?: string;
  expectedImpact?: ImpactLevel;
  confidence?: ImpactLevel;
  effort?: EffortLevel;
  planningNotes?: string;
}

export interface ProblemFields {
  title: string;
  hypothesis?: string;
  expectedImpact?: ImpactLevel;
  confidence?: ImpactLevel;
  effort?: EffortLevel;
  planningNotes?: string;
  state?: ProblemState;
}

export interface Milestone {
  id: string;
  label: string;
  done: boolean;
}

export interface GoalFields {
  title: string;
  measuredBy: string;
  mode: GoalMode;
  startValue?: string;
  goalValue?: string;
  department?: string;
  team?: string;
  statusUpdate?: string;
  statusUpdateDate?: string;
  milestones?: Milestone[];
}

export interface WorkFields {
  description: string;
  done: boolean;
  statusUpdate?: string;
  statusUpdateDate?: string;
}

export type CardFields =
  | ({ columnId: "northstar" } & NorthStarFields)
  | ({ columnId: "drivers" } & DriverFields)
  | ({ columnId: "problems" } & ProblemFields)
  | ({ columnId: "goals" } & GoalFields)
  | ({ columnId: "work" } & WorkFields);

export interface Card {
  id: string;
  columnId: ColumnId;
  saved: boolean;
  collapsed: boolean;
  fields: CardFields;
}

export interface ColumnMeta {
  title: string;
  subtitle: string;
}

export interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
}

export interface BoardState {
  templateId: TemplateId;
  cycleName: string;
  columnMeta: Record<string, ColumnMeta>;
  cards: Card[];
  connections: Connection[];
}

/** A persisted board row in Dexie. `state` carries the BoardState; the
 *  top-level fields are indexed for listBoards-style queries. */
export interface BoardRow extends BoardState {
  id: string;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Helper to narrow a Card by its column. */
export function isCardOfColumn<C extends string>(
  card: Card,
  columnId: C,
): card is Card & {
  columnId: C;
  fields: Extract<CardFields, { columnId: C }>;
} {
  return card.columnId === columnId;
}
