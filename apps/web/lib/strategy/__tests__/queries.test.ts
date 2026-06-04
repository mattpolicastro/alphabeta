import { describe, expect, it } from "vitest";
import {
  deleteBoard,
  getBoard,
  listBoards,
  mintBoard,
  saveBoard,
} from "@/lib/strategy/queries";
import type { BoardState } from "@/lib/strategy/types";

function emptyNsfBoard(): BoardState {
  return {
    templateId: "nsf",
    cycleName: "Test cycle",
    columnMeta: {
      northstar: { title: "NORTH STAR", subtitle: "" },
      drivers: { title: "DRIVERS", subtitle: "" },
    },
    cards: [],
    connections: [],
  };
}

describe("mintBoard", () => {
  it("creates a row with a UUID and timestamps", async () => {
    const row = await mintBoard(emptyNsfBoard());
    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(row.templateId).toBe("nsf");
    expect(row.ownerId).toBeNull();
    expect(row.createdAt).toBe(row.updatedAt);
  });

  it("persists the full BoardState (cards + connections roundtrip)", async () => {
    const state: BoardState = {
      ...emptyNsfBoard(),
      cards: [
        {
          id: "c1",
          columnId: "northstar",
          saved: true,
          collapsed: false,
          fields: {
            columnId: "northstar",
            title: "Activate users",
            measuredBy: "WAU",
            startValue: "1000",
            startDate: "2026-01-01",
            goalValue: "5000",
            goalDate: "2026-12-31",
          },
        },
      ],
      connections: [{ id: "k1", fromCardId: "c1", toCardId: "c1" }],
    };
    const row = await mintBoard(state);
    const fetched = await getBoard(row.id);
    expect(fetched?.cards).toHaveLength(1);
    expect(fetched?.cards[0].id).toBe("c1");
    expect(fetched?.connections).toHaveLength(1);
  });
});

describe("getBoard", () => {
  it("returns undefined for an unknown id", async () => {
    expect(await getBoard("nope")).toBeUndefined();
  });
});

describe("listBoards", () => {
  it("returns an empty array on a fresh DB", async () => {
    expect(await listBoards()).toEqual([]);
  });

  it("returns boards ordered by updatedAt desc", async () => {
    const a = await mintBoard(emptyNsfBoard());
    await new Promise((r) => setTimeout(r, 5));
    const b = await mintBoard(emptyNsfBoard());
    await new Promise((r) => setTimeout(r, 5));
    const c = await mintBoard(emptyNsfBoard());
    const list = await listBoards();
    expect(list.map((r) => r.id)).toEqual([c.id, b.id, a.id]);
  });
});

describe("saveBoard", () => {
  it("merges the patch and bumps updatedAt", async () => {
    const row = await mintBoard(emptyNsfBoard());
    const before = row.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await saveBoard(row.id, { cycleName: "Q3" });
    const after = await getBoard(row.id);
    expect(after?.cycleName).toBe("Q3");
    expect(after?.updatedAt).not.toBe(before);
  });

  it("rejects unknown id", async () => {
    await expect(saveBoard("unknown", { cycleName: "x" })).rejects.toThrow(
      /not found/i,
    );
  });
});

describe("deleteBoard", () => {
  it("removes the row", async () => {
    const row = await mintBoard(emptyNsfBoard());
    await deleteBoard(row.id);
    expect(await getBoard(row.id)).toBeUndefined();
  });
});
