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
  if (templateId === "gps") return gpsSolutionDump(card, board);
  if (templateId === "rice") return ricePrioritizedDump(card, board);
  if (templateId === "okr") return okrInitiativeDump(card, board);
  if (templateId === "gist") return gistTaskDump(card, board);
  throw new Error(`cardToDump: unsupported templateId "${templateId}"`);
}

function nsfWorkDump(card: Card, board: BoardState): string {
  if (card.fields.columnId !== "work") {
    throw new Error("nsfWorkDump: expected a work-column card");
  }
  const work = card.fields;
  const ancestors = resolveAncestors(card.id, board);

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

  appendAncestorContext(lines, ancestors);
  return lines.join("\n");
}

function gpsSolutionDump(card: Card, board: BoardState): string {
  if (card.fields.columnId !== "solutions") {
    throw new Error("gpsSolutionDump: expected a solutions-column card");
  }
  const f = card.fields;
  const ancestors = resolveAncestors(card.id, board);

  const closestGoal = ancestors.find((c) => c.fields.columnId === "gps-goals");
  const closestProblem = ancestors.find(
    (c) => c.fields.columnId === "gps-problems",
  );

  const lines: string[] = [];
  lines.push(`Change: ${f.title.trim() || "(no title)"}`);
  lines.push("Direction: lift");

  if (closestGoal?.fields.columnId === "gps-goals") {
    const g = closestGoal.fields;
    if (g.measuredBy?.trim()) lines.push(`Metric: ${g.measuredBy.trim()}`);
    if (g.targetValue?.trim()) lines.push(`Magnitude: ${g.targetValue.trim()}`);
  }
  if (closestProblem?.fields.columnId === "gps-problems") {
    const p = closestProblem.fields;
    if (p.title?.trim()) lines.push(`Mechanism: ${p.title.trim()}`);
  }
  if (f.description?.trim()) {
    lines.push(`Description: ${f.description.trim()}`);
  }

  appendAncestorContext(lines, ancestors);
  return lines.join("\n");
}

function ricePrioritizedDump(card: Card, board: BoardState): string {
  if (card.fields.columnId !== "prioritized") {
    throw new Error("ricePrioritizedDump: expected a prioritized-column card");
  }
  const f = card.fields;
  const ancestors = resolveAncestors(card.id, board);

  const closestIdea = ancestors.find((c) => c.fields.columnId === "ideas");
  const closestScoring = ancestors.find(
    (c) => c.fields.columnId === "scoring",
  );

  const lines: string[] = [];
  lines.push(`Change: ${f.title.trim() || "(no title)"}`);
  lines.push("Direction: lift");

  if (closestIdea?.fields.columnId === "ideas") {
    const idea = closestIdea.fields;
    if (idea.description?.trim()) lines.push(`Mechanism: ${idea.description.trim()}`);
  }
  if (closestScoring?.fields.columnId === "scoring") {
    const s = closestScoring.fields;
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

  appendAncestorContext(lines, ancestors);
  return lines.join("\n");
}

function okrInitiativeDump(card: Card, board: BoardState): string {
  if (card.fields.columnId !== "initiatives") {
    throw new Error("okrInitiativeDump: expected an initiatives-column card");
  }
  const f = card.fields;
  const ancestors = resolveAncestors(card.id, board);

  const closestKR = ancestors.find(
    (c) => c.fields.columnId === "key-results",
  );
  const closestObj = ancestors.find(
    (c) => c.fields.columnId === "objectives",
  );

  const lines: string[] = [];
  lines.push(`Change: ${f.title.trim() || "(no title)"}`);
  lines.push("Direction: lift");

  if (closestKR?.fields.columnId === "key-results") {
    const kr = closestKR.fields;
    if (kr.measuredBy?.trim()) lines.push(`Metric: ${kr.measuredBy.trim()}`);
    if (kr.targetValue?.trim()) lines.push(`Magnitude: ${kr.targetValue.trim()}`);
  }
  if (closestObj?.fields.columnId === "objectives") {
    const obj = closestObj.fields;
    if (obj.title?.trim()) lines.push(`Mechanism: ${obj.title.trim()}`);
  }
  if (f.description?.trim()) {
    lines.push(`Description: ${f.description.trim()}`);
  }

  appendAncestorContext(lines, ancestors);
  return lines.join("\n");
}

function gistTaskDump(card: Card, board: BoardState): string {
  if (card.fields.columnId !== "tasks") {
    throw new Error("gistTaskDump: expected a tasks-column card");
  }
  const f = card.fields;
  const ancestors = resolveAncestors(card.id, board);

  const closestStep = ancestors.find((c) => c.fields.columnId === "steps");
  const closestGoal = ancestors.find(
    (c) => c.fields.columnId === "gist-goals",
  );

  const lines: string[] = [];
  lines.push(`Change: ${f.description.trim() || "(no description)"}`);
  lines.push("Direction: lift");

  if (closestGoal?.fields.columnId === "gist-goals") {
    const g = closestGoal.fields;
    if (g.measuredBy?.trim()) lines.push(`Metric: ${g.measuredBy.trim()}`);
    if (g.targetValue?.trim()) lines.push(`Magnitude: ${g.targetValue.trim()}`);
  }
  if (closestStep?.fields.columnId === "steps") {
    const s = closestStep.fields;
    if (s.title?.trim()) lines.push(`Mechanism: ${s.title.trim()}`);
  }

  appendAncestorContext(lines, ancestors);
  return lines.join("\n");
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
      const title = ancestorTitle(a);
      if (title) lines.push(`- ${a.fields.columnId}: ${title}`);
    }
  }
}

function ancestorTitle(card: Card): string {
  const f = card.fields;
  if (f.columnId === "work" || f.columnId === "tasks") return f.description;
  if ("title" in f && typeof f.title === "string") return f.title;
  if ("description" in f && typeof f.description === "string") return f.description;
  return "";
}
