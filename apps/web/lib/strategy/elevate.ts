import type { BoardState, Card, TemplateId } from "@/lib/strategy/types";
import { getTemplate } from "@/lib/strategy/templates";
import { getAncestors } from "@/lib/strategy/utils/lineage";

export function isElevatable(card: Card, templateId: TemplateId): boolean {
  if (!card.saved) return false;
  const cols = getTemplate(templateId).columns;
  const rightmost = cols[cols.length - 1]?.id;
  return card.columnId === rightmost;
}

interface DumpConfig {
  changeField: "title" | "description";
  goalColumns: string[];
  metricField: string;
  magnitudeField: string;
  mechanismColumns: string[];
  mechanismField: "title" | "description";
}

const DUMP_CONFIG: Record<TemplateId, DumpConfig> = {
  nsf: {
    changeField: "description",
    goalColumns: ["goals"],
    metricField: "measuredBy",
    magnitudeField: "goalValue",
    mechanismColumns: ["problems"],
    mechanismField: "title",
  },
  gps: {
    changeField: "title",
    goalColumns: ["gps-goals"],
    metricField: "measuredBy",
    magnitudeField: "targetValue",
    mechanismColumns: ["gps-problems"],
    mechanismField: "title",
  },
  rice: {
    changeField: "title",
    goalColumns: [],
    metricField: "",
    magnitudeField: "",
    mechanismColumns: ["ideas"],
    mechanismField: "description",
  },
  okr: {
    changeField: "title",
    goalColumns: ["key-results"],
    metricField: "measuredBy",
    magnitudeField: "targetValue",
    mechanismColumns: ["objectives"],
    mechanismField: "title",
  },
  gist: {
    changeField: "description",
    goalColumns: ["gist-goals"],
    metricField: "measuredBy",
    magnitudeField: "targetValue",
    mechanismColumns: ["steps"],
    mechanismField: "title",
  },
};

export function cardToDump(
  card: Card,
  board: BoardState,
  templateId: TemplateId,
): string {
  if (!isElevatable(card, templateId)) {
    throw new Error(
      `cardToDump: only rightmost-column (elevatable) cards can be stringified for analysis.`,
    );
  }

  const cfg = DUMP_CONFIG[templateId];
  const f = card.fields as Record<string, unknown>;
  const ancestors = resolveAncestors(card.id, board);

  const lines: string[] = [];

  const change = str(f[cfg.changeField]);
  lines.push(`Change: ${change || "(no description)"}`);
  lines.push("Direction: lift");

  if (cfg.goalColumns.length > 0) {
    const goal = ancestors.find((c) =>
      cfg.goalColumns.includes(c.fields.columnId),
    );
    if (goal) {
      const gf = goal.fields as Record<string, unknown>;
      const metric = str(gf[cfg.metricField]);
      const magnitude = str(gf[cfg.magnitudeField]);
      if (metric) lines.push(`Metric: ${metric}`);
      if (magnitude) lines.push(`Magnitude: ${magnitude}`);
    }
  }

  if (cfg.mechanismColumns.length > 0) {
    const mech = ancestors.find((c) =>
      cfg.mechanismColumns.includes(c.fields.columnId),
    );
    if (mech) {
      const mf = mech.fields as Record<string, unknown>;
      const mechanism = str(mf[cfg.mechanismField]);
      if (mechanism) lines.push(`Mechanism: ${mechanism}`);
    }
  }

  // RICE-specific: scoring dimensions and score
  if (templateId === "rice") {
    appendRiceExtras(f, ancestors, lines);
  }

  const desc = str(f.description);
  if (cfg.changeField !== "description" && desc) {
    lines.push(`Description: ${desc}`);
  }

  // NSF-specific: status update
  const statusUpdate = str(f.statusUpdate);
  if (statusUpdate) {
    const when = f.statusUpdateDate ? ` (${f.statusUpdateDate})` : "";
    lines.push(`Status update: ${statusUpdate}${when}`);
  }

  appendAncestorContext(lines, ancestors);
  return lines.join("\n");
}

function appendRiceExtras(
  f: Record<string, unknown>,
  ancestors: Card[],
  lines: string[],
): void {
  const scoring = ancestors.find((c) => c.fields.columnId === "scoring");
  if (scoring) {
    const s = scoring.fields as Record<string, unknown>;
    const parts = [
      s.reach != null ? `R:${s.reach}` : null,
      s.impact != null ? `I:${s.impact}` : null,
      s.confidence != null ? `C:${s.confidence}` : null,
      s.effort != null ? `E:${s.effort}` : null,
    ].filter(Boolean);
    if (parts.length > 0) lines.push(`RICE dimensions: ${parts.join(" ")}`);
  }
  if (f.riceScore != null) {
    lines.push(`Score: ${f.riceScore}`);
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function resolveAncestors(cardId: string, board: BoardState): Card[] {
  const ancestorIds = getAncestors(cardId, board.connections);
  const byId = new Map(board.cards.map((c) => [c.id, c]));
  return [...ancestorIds]
    .map((id) => byId.get(id))
    .filter((c): c is Card => !!c);
}

function appendAncestorContext(lines: string[], ancestors: Card[]): void {
  if (ancestors.length > 0) {
    lines.push("", "Context:");
    for (const a of ancestors) {
      const title = cardLabel(a);
      if (title) lines.push(`- ${a.fields.columnId}: ${title}`);
    }
  }
}

function cardLabel(card: Card): string {
  const f = card.fields as Record<string, unknown>;
  if (typeof f.description === "string") return f.description;
  if (typeof f.title === "string") return f.title;
  return "";
}
