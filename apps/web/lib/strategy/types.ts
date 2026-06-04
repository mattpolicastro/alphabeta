// Strategy layer types — ported from plinthboard.
// Persistence in alphaBeta is Dexie-backed (lib/strategy/queries.ts)
// instead of Plinth's localStorage, but the in-memory shape is identical.

export type ColumnId = string;

export type TemplateId = "nsf" | "rice" | "gps" | "okr" | "gist";

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

// --- RICE ---
export interface RiceIdeaFields {
  title: string;
  description?: string;
  category?: string;
}

export interface RiceScoringFields {
  title: string;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
}

export interface RicePrioritizedFields {
  title: string;
  riceScore?: number;
  status?: "queued" | "in-progress" | "done";
  owner?: string;
}

// --- GPS ---
export interface GpsGoalFields {
  title: string;
  successCriteria?: string;
  measuredBy?: string;
  targetValue?: string;
}

export interface GpsProblemFields {
  title: string;
  description?: string;
  severity?: "critical" | "major" | "minor";
  evidence?: string;
}

export interface GpsSolutionFields {
  title: string;
  description?: string;
  effort?: "high" | "medium" | "low";
  impact?: "high" | "medium" | "low";
  status?: "proposed" | "in-progress" | "done";
}

// --- OKR ---
export interface OkrObjectiveFields {
  title: string;
  description?: string;
  timeframe?: string;
  owner?: string;
}

export interface OkrKeyResultFields {
  title: string;
  measuredBy?: string;
  startValue?: string;
  targetValue?: string;
  currentValue?: string;
}

export interface OkrInitiativeFields {
  title: string;
  description?: string;
  status?: "not-started" | "in-progress" | "done" | "blocked";
  owner?: string;
  keyResultId?: string;
}

// --- GIST ---
export interface GistGoalFields {
  title: string;
  measuredBy?: string;
  targetValue?: string;
  timeframe?: string;
}

export interface GistIdeaFields {
  title: string;
  description?: string;
  confidence?: "high" | "medium" | "low";
  impact?: "high" | "medium" | "low";
}

export interface GistStepFields {
  title: string;
  description?: string;
  status?: "planned" | "in-progress" | "done";
  owner?: string;
}

export interface GistTaskFields {
  description: string;
  done: boolean;
  owner?: string;
}

export type CardFields =
  | ({ columnId: "northstar" } & NorthStarFields)
  | ({ columnId: "drivers" } & DriverFields)
  | ({ columnId: "problems" } & ProblemFields)
  | ({ columnId: "goals" } & GoalFields)
  | ({ columnId: "work" } & WorkFields)
  // RICE
  | ({ columnId: "ideas" } & RiceIdeaFields)
  | ({ columnId: "scoring" } & RiceScoringFields)
  | ({ columnId: "prioritized" } & RicePrioritizedFields)
  // GPS
  | ({ columnId: "gps-goals" } & GpsGoalFields)
  | ({ columnId: "gps-problems" } & GpsProblemFields)
  | ({ columnId: "solutions" } & GpsSolutionFields)
  // OKR
  | ({ columnId: "objectives" } & OkrObjectiveFields)
  | ({ columnId: "key-results" } & OkrKeyResultFields)
  | ({ columnId: "initiatives" } & OkrInitiativeFields)
  // GIST
  | ({ columnId: "gist-goals" } & GistGoalFields)
  | ({ columnId: "gist-ideas" } & GistIdeaFields)
  | ({ columnId: "steps" } & GistStepFields)
  | ({ columnId: "tasks" } & GistTaskFields);

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
