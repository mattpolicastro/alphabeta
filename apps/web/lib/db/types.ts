// Data model for the discipline layer. See `design/README.md` § Suggested
// Data Model and `docs/handoff-2026-06-03.md` for the load-bearing decisions
// (fold-if as single thread; immutability after lock; deviation logging).

export type Confidence = "hunch-level" | "fairly" | "highly";
export type Direction = "lift" | "reduce";
export type InstrumentType =
  | "ab"
  | "quasi"
  | "observational"
  | "holdback"
  | "interviews";
export type BetStatus = "draft" | "locked" | "running" | "resolved";
export type Outcome = "win" | "inconclusive" | "loss";
export type Call = "keep" | "hold" | "revert";

export interface Articulation {
  change: string;
  direction: Direction;
  metric: string;
  magnitude: string;
  mechanism: string | null;
  confidence: Confidence;
  foldIf: string;
}

export interface Instrument {
  type: InstrumentType;
  overrideReason: string | null;
  feasibility: Record<string, unknown>;
}

export interface Criteria {
  win: string;
  inconclusive: string;
  loss: string;
  minMindChanger: string;
  evidenceBar: string;
  runtime: number | null;
}

export type IntegrityFlagType =
  | "srm"
  | "peek"
  | "guardrail"
  | "guide_drift"
  | "recruitment_drift";

export interface IntegrityFlag {
  type: IntegrityFlagType;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface Deviation {
  occurred: boolean;
  reason: string | null;
}

export interface Resolution {
  outcome: Outcome | null;
  actuals: Record<string, unknown>;
  integrityFlags: IntegrityFlag[];
  call: Call | null;
  deviation: Deviation;
  resolvedAt: string | null;
}

export interface Learning {
  calibration: string | null;
  reflection: string | null;
}

export interface Bet {
  id: string;
  cardId: string | null;
  ownerId: string | null;
  type: "single" | "sequence";

  articulation: Articulation;
  instrument: Instrument;
  criteria: Criteria;

  status: BetStatus;
  lockedAt: string | null;
  fingerprint: string | null;

  // Immutability lineage. When a locked bet is edited, the application
  // layer writes a new Bet row that references the prior version here.
  previousVersionId: string | null;

  resolution: Resolution;
  learning: Learning;

  createdAt: string;
  updatedAt: string;
}

// The committed-fields subset hashed for tamper-evidence. The fingerprint
// is SHA-256(canonical-JSON(LockedSnapshot)). See `lib/integrity/fingerprint.ts`.
export interface LockedSnapshot {
  articulation: Articulation;
  instrument: Instrument;
  criteria: Criteria;
  lockedAt: string;
}
