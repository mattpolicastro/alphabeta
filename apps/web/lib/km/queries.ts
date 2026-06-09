import { getDb } from "@/lib/db";
import type { Bet } from "@/lib/db/types";
import type { ResolvedBetRecord, BetOutcome } from "./types";
import { classifyMechanism } from "./classify";

function mapOutcome(bet: Bet): BetOutcome {
  const o = bet.resolution.outcome;
  if (o === "win") return "won";
  if (o === "loss") return "lost";
  return "inconclusive";
}

function toRecord(bet: Bet): ResolvedBetRecord {
  const a = bet.articulation;
  return {
    id: bet.id,
    question: a.change,
    surface: bet.surface ?? "unknown",
    mechanism: classifyMechanism(a.mechanism ?? ""),
    mechanismText: a.mechanism ?? "",
    expected: a.magnitude ? `+${a.magnitude.replace(/^\+/, "")}` : "—",
    actual: formatActual(bet),
    outcome: mapOutcome(bet),
    learning: bet.learning.calibration ?? bet.learning.reflection ?? "",
    resolvedAt: bet.resolution.resolvedAt
      ? Date.parse(bet.resolution.resolvedAt)
      : Date.now(),
  };
}

function formatActual(bet: Bet): string {
  const lift = bet.resolution.actuals?.lift;
  if (typeof lift === "number") {
    return lift >= 0 ? `+${lift}%` : `${lift}%`;
  }
  return "—";
}

export async function listResolvedBets(): Promise<ResolvedBetRecord[]> {
  const db = getDb();
  const bets = await db.bets
    .where("status")
    .equals("resolved")
    .toArray();
  return bets.map(toRecord);
}
