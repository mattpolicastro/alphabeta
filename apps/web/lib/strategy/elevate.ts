// Card → bet elevation: produces the labeled-field dump that
// `analyzeDump(text, { source: "strategy-card" })` knows how to parse.
//
// Only cards in a template's rightmost column are elevatable — that column
// is the action layer (NSF: work, OKR: initiatives, RICE: prioritized,
// etc.), the natural unit of an experiment. Anchoring layers (north star,
// drivers, problems, goals) frame the question; they don't get measured
// directly.
//
// For an NSF Work card, the dump walks ancestors via the connection graph
// to pull Metric (from the closest goal's measuredBy), Magnitude (from
// that goal's goalValue), and Mechanism (from the closest problem's
// title). Anything we can't recover gets left off — analyzeDump returns
// `undefined` for missing labels, so the caller never overwrites a draft
// field it didn't mean to.

import type { BoardState, Card, TemplateId } from "@/lib/strategy/types";
import { getTemplate } from "@/lib/strategy/templates";
import { getAncestors } from "@/lib/strategy/utils/lineage";

export function isElevatable(card: Card, templateId: TemplateId): boolean {
  if (!card.saved) return false;
  const cols = getTemplate(templateId).columns;
  const rightmost = cols[cols.length - 1]?.id;
  return card.columnId === rightmost;
}

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
  if (templateId === "nsf") return nsfWorkDump(card, board);
  // Future templates: branch here.
  throw new Error(`cardToDump: unsupported templateId "${templateId}"`);
}

function nsfWorkDump(card: Card, board: BoardState): string {
  if (card.fields.columnId !== "work") {
    throw new Error("nsfWorkDump: expected a work-column card");
  }
  const work = card.fields;
  const ancestorIds = getAncestors(card.id, board.connections);
  const byId = new Map(board.cards.map((c) => [c.id, c]));
  const ancestors = [...ancestorIds]
    .map((id) => byId.get(id))
    .filter((c): c is Card => !!c);

  const closestGoal = ancestors.find((c) => c.fields.columnId === "goals");
  const closestProblem = ancestors.find(
    (c) => c.fields.columnId === "problems",
  );

  const lines: string[] = [];
  lines.push(`Change: ${work.description.trim() || "(no description)"}`);
  lines.push("Direction: lift");

  if (closestGoal?.fields.columnId === "goals") {
    const g = closestGoal.fields;
    if (g.measuredBy?.trim()) lines.push(`Metric: ${g.measuredBy.trim()}`);
    if (g.goalValue?.trim()) lines.push(`Magnitude: ${g.goalValue.trim()}`);
  }
  if (closestProblem?.fields.columnId === "problems") {
    const p = closestProblem.fields;
    if (p.title?.trim()) lines.push(`Mechanism: ${p.title.trim()}`);
  }

  if (work.statusUpdate?.trim()) {
    const when = work.statusUpdateDate
      ? ` (${work.statusUpdateDate})`
      : "";
    lines.push(`Status update: ${work.statusUpdate.trim()}${when}`);
  }

  if (ancestors.length > 0) {
    lines.push("", "Context:");
    for (const a of ancestors) {
      const title = ancestorTitle(a);
      if (title) lines.push(`- ${a.fields.columnId}: ${title}`);
    }
  }

  return lines.join("\n");
}

function ancestorTitle(card: Card): string {
  const f = card.fields;
  if (f.columnId === "work" || f.columnId === "tasks") return f.description;
  return f.title;
}
