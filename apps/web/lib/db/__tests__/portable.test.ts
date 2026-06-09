import { describe, expect, it, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import {
  exportAll,
  importAll,
  validateEnvelope,
  CURRENT_EXPORT_VERSION,
  type ExportEnvelope,
} from "../portable";

function makeBet(overrides: Record<string, unknown> = {}) {
  return {
    id: `bet-${Math.random().toString(36).slice(2, 8)}`,
    cardId: null,
    ownerId: null,
    type: "single",
    articulation: {
      change: "test change",
      direction: "lift",
      metric: "conversion",
      magnitude: "5%",
      mechanism: null,
      confidence: "hunch-level",
      foldIf: "< 1%",
    },
    instrument: {
      type: "ab",
      overrideReason: null,
      feasibility: {},
    },
    criteria: {
      win: "> 5%",
      inconclusive: "1-5%",
      loss: "< 1%",
      minMindChanger: "3%",
      evidenceBar: "p < 0.05",
      runtime: null,
    },
    status: "draft",
    lockedAt: null,
    fingerprint: null,
    previousVersionId: null,
    resolution: {
      outcome: null,
      actuals: {},
      integrityFlags: [],
      call: null,
      deviation: { occurred: false, reason: null },
      resolvedAt: null,
    },
    learning: { calibration: null, reflection: null },
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    id: `board-${Math.random().toString(36).slice(2, 8)}`,
    ownerId: null,
    templateId: "nsf",
    cycleName: "Q3 2026",
    columnMeta: {},
    cards: [],
    connections: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("exportAll", () => {
  it("exports an empty database", async () => {
    const envelope = await exportAll();
    expect(envelope.version).toBe(CURRENT_EXPORT_VERSION);
    expect(envelope.tables.bets).toEqual([]);
    expect(envelope.tables.boards).toEqual([]);
    expect(envelope.exportedAt).toBeTruthy();
    expect(envelope.dbVersion).toBeGreaterThan(0);
  });

  it("exports bets and boards", async () => {
    const db = getDb();
    await db.bets.add(makeBet({ id: "bet-1" }) as never);
    await db.boards.add(makeBoard({ id: "board-1" }) as never);

    const envelope = await exportAll();
    expect(envelope.tables.bets).toHaveLength(1);
    expect(envelope.tables.bets[0].id).toBe("bet-1");
    expect(envelope.tables.boards).toHaveLength(1);
    expect(envelope.tables.boards[0].id).toBe("board-1");
  });
});

describe("validateEnvelope", () => {
  it("rejects non-objects", () => {
    expect(validateEnvelope(null)).toEqual({
      ok: false,
      error: "Not a valid JSON object",
    });
    expect(validateEnvelope("string")).toEqual({
      ok: false,
      error: "Not a valid JSON object",
    });
  });

  it("rejects missing version", () => {
    const result = validateEnvelope({ tables: { bets: [], boards: [] } });
    expect(result?.ok).toBe(false);
    expect(result?.error).toContain("version");
  });

  it("rejects future versions", () => {
    const result = validateEnvelope({
      version: CURRENT_EXPORT_VERSION + 1,
      tables: { bets: [], boards: [] },
    });
    expect(result?.ok).toBe(false);
    expect(result?.error).toContain("newer");
  });

  it("rejects missing tables", () => {
    const result = validateEnvelope({ version: 1 });
    expect(result?.ok).toBe(false);
    expect(result?.error).toContain("tables");
  });

  it("rejects invalid bet shapes", () => {
    const result = validateEnvelope({
      version: 1,
      tables: { bets: [{ id: 123 }], boards: [] },
    });
    expect(result?.ok).toBe(false);
    expect(result?.error).toContain("bets[0]");
  });

  it("rejects invalid bet status", () => {
    const result = validateEnvelope({
      version: 1,
      tables: {
        bets: [{ id: "x", status: "bogus", articulation: {} }],
        boards: [],
      },
    });
    expect(result?.ok).toBe(false);
    expect(result?.error).toContain("invalid status");
  });

  it("passes valid envelopes", () => {
    const envelope: ExportEnvelope = {
      version: 1,
      exportedAt: "2026-06-09T00:00:00.000Z",
      dbVersion: 4,
      tables: {
        bets: [makeBet() as never],
        boards: [makeBoard() as never],
      },
    };
    expect(validateEnvelope(envelope)).toBeNull();
  });
});

describe("importAll", () => {
  it("rejects invalid data", async () => {
    const result = await importAll("not json");
    expect(result.ok).toBe(false);
  });

  it("imports into an empty database (merge)", async () => {
    const envelope: ExportEnvelope = {
      version: 1,
      exportedAt: "2026-06-09T00:00:00.000Z",
      dbVersion: 4,
      tables: {
        bets: [makeBet({ id: "import-1" }) as never],
        boards: [makeBoard({ id: "board-import-1" }) as never],
      },
    };

    const result = await importAll(envelope);
    expect(result).toEqual({
      ok: true,
      counts: { bets: 1, boards: 1 },
    });

    const db = getDb();
    const bet = await db.bets.get("import-1");
    expect(bet?.id).toBe("import-1");
    const board = await db.boards.get("board-import-1");
    expect(board?.id).toBe("board-import-1");
  });

  it("merge mode preserves existing records", async () => {
    const db = getDb();
    await db.bets.add(makeBet({ id: "existing" }) as never);

    const envelope: ExportEnvelope = {
      version: 1,
      exportedAt: "2026-06-09T00:00:00.000Z",
      dbVersion: 4,
      tables: {
        bets: [makeBet({ id: "new-one" }) as never],
        boards: [],
      },
    };

    await importAll(envelope, "merge");
    const all = await db.bets.toArray();
    expect(all).toHaveLength(2);
    expect(all.map((b) => b.id).sort()).toEqual(["existing", "new-one"]);
  });

  it("merge mode overwrites records with same id", async () => {
    const db = getDb();
    await db.bets.add(
      makeBet({ id: "dup", articulation: { change: "old" } }) as never,
    );

    const envelope: ExportEnvelope = {
      version: 1,
      exportedAt: "2026-06-09T00:00:00.000Z",
      dbVersion: 4,
      tables: {
        bets: [
          makeBet({ id: "dup", articulation: { change: "new" } }) as never,
        ],
        boards: [],
      },
    };

    await importAll(envelope, "merge");
    const bet = await db.bets.get("dup");
    expect((bet?.articulation as { change: string }).change).toBe("new");
  });

  it("replace mode clears existing data", async () => {
    const db = getDb();
    await db.bets.add(makeBet({ id: "will-be-gone" }) as never);

    const envelope: ExportEnvelope = {
      version: 1,
      exportedAt: "2026-06-09T00:00:00.000Z",
      dbVersion: 4,
      tables: {
        bets: [makeBet({ id: "replacement" }) as never],
        boards: [],
      },
    };

    await importAll(envelope, "replace");
    const all = await db.bets.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("replacement");
  });

  it("round-trips: export then import", async () => {
    const db = getDb();
    await db.bets.add(makeBet({ id: "round-trip" }) as never);
    await db.boards.add(makeBoard({ id: "board-rt" }) as never);

    const exported = await exportAll();

    // Clear and re-import
    await db.bets.clear();
    await db.boards.clear();
    expect(await db.bets.count()).toBe(0);

    const result = await importAll(exported, "replace");
    expect(result).toEqual({ ok: true, counts: { bets: 1, boards: 1 } });

    const bet = await db.bets.get("round-trip");
    expect(bet?.id).toBe("round-trip");
  });
});
