export type PlanBetStatus = "won" | "running" | "locked" | "draft";

export interface PlanBet {
  id: string;
  name: string;
  surface: string;
  metric: string;
  status: PlanBetStatus;
  start: number;
  dur: number;
  dep?: string;
  resolved?: boolean;
}

export interface SequenceGroup {
  type: "seq";
  id: string;
  name: string;
  chain: string;
  bets: PlanBet[];
}

export interface StandaloneBet {
  type: "solo";
  bet: PlanBet;
}

export type PlanEntry = SequenceGroup | StandaloneBet;

export interface Contention {
  a: PlanBet;
  b: PlanBet;
  start: number;
  end: number;
  overlaps: boolean;
  surface: string;
}
