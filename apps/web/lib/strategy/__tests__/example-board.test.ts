// Smoke test on the NSF example board fixture (ported verbatim from
// nsf-board/src/templates/nsf.ts). Guards three things: the factory
// returns the expected shape, every connection points at an existing
// card, and every card sits in a valid NSF column. If a future edit
// breaks any of those invariants, the demo onramp (/strategy/new?
// example=nsf) and any test that builds a board from this fixture
// will start surfacing nonsense; better to catch it here.

import { describe, expect, it } from "vitest";
import { getTemplate } from "@/lib/strategy/templates";
import { mintBoard, getBoard } from "@/lib/strategy/queries";

const NSF_COLUMNS = new Set([
  "northstar",
  "drivers",
  "problems",
  "goals",
  "work",
]);

describe("NSF example board fixture", () => {
  const example = getTemplate("nsf").exampleBoard();

  it("returns the expected card and connection counts", () => {
    expect(example.cards).toHaveLength(22);
    expect(example.connections).toHaveLength(14);
  });

  it("targets the nsf template", () => {
    expect(example.templateId).toBe("nsf");
  });

  it("places every card in a valid NSF column", () => {
    for (const card of example.cards) {
      expect(NSF_COLUMNS.has(card.columnId)).toBe(true);
    }
  });

  it("references only existing cards in connections", () => {
    const cardIds = new Set(example.cards.map((c) => c.id));
    for (const conn of example.connections) {
      expect(cardIds.has(conn.fromCardId)).toBe(true);
      expect(cardIds.has(conn.toCardId)).toBe(true);
    }
  });

  it("round-trips through mintBoard intact", async () => {
    const row = await mintBoard(example);
    const fetched = await getBoard(row.id);
    expect(fetched?.cards).toHaveLength(22);
    expect(fetched?.connections).toHaveLength(14);
  });
});
