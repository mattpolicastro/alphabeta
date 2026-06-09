import { getDb } from "./index";
import type { Bet } from "./types";
import type { BoardRow } from "@/lib/strategy/types";

export const CURRENT_EXPORT_VERSION = 1;

export interface ExportEnvelope {
  version: number;
  exportedAt: string;
  dbVersion: number;
  tables: {
    bets: Bet[];
    boards: BoardRow[];
  };
}

export type ImportResult =
  | { ok: true; counts: { bets: number; boards: number } }
  | { ok: false; error: string };

export async function exportAll(): Promise<ExportEnvelope> {
  const db = getDb();
  const [bets, boards] = await Promise.all([
    db.bets.toArray(),
    db.boards.toArray(),
  ]);

  return {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    dbVersion: db.verno,
    tables: { bets, boards },
  };
}

export function validateEnvelope(data: unknown): ImportResult | null {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Not a valid JSON object" };
  }

  const envelope = data as Record<string, unknown>;

  if (typeof envelope.version !== "number") {
    return { ok: false, error: "Missing or invalid version field" };
  }

  if (envelope.version > CURRENT_EXPORT_VERSION) {
    return {
      ok: false,
      error: `Export version ${envelope.version} is newer than this app supports (${CURRENT_EXPORT_VERSION}). Update the app first.`,
    };
  }

  if (!envelope.tables || typeof envelope.tables !== "object") {
    return { ok: false, error: "Missing tables field" };
  }

  const tables = envelope.tables as Record<string, unknown>;

  if (!Array.isArray(tables.bets)) {
    return { ok: false, error: "tables.bets must be an array" };
  }
  if (!Array.isArray(tables.boards)) {
    return { ok: false, error: "tables.boards must be an array" };
  }

  for (const [i, bet] of tables.bets.entries()) {
    const err = validateBetShape(bet, i);
    if (err) return { ok: false, error: err };
  }

  for (const [i, board] of tables.boards.entries()) {
    const err = validateBoardShape(board, i);
    if (err) return { ok: false, error: err };
  }

  return null;
}

function validateBetShape(bet: unknown, index: number): string | null {
  if (!bet || typeof bet !== "object") {
    return `bets[${index}]: not an object`;
  }
  const b = bet as Record<string, unknown>;
  if (typeof b.id !== "string" || !b.id) {
    return `bets[${index}]: missing or invalid id`;
  }
  if (typeof b.status !== "string") {
    return `bets[${index}]: missing status`;
  }
  const validStatuses = ["draft", "ready", "locked", "running", "resolved"];
  if (!validStatuses.includes(b.status)) {
    return `bets[${index}]: invalid status "${b.status}"`;
  }
  if (!b.articulation || typeof b.articulation !== "object") {
    return `bets[${index}]: missing articulation`;
  }
  return null;
}

function validateBoardShape(board: unknown, index: number): string | null {
  if (!board || typeof board !== "object") {
    return `boards[${index}]: not an object`;
  }
  const b = board as Record<string, unknown>;
  if (typeof b.id !== "string" || !b.id) {
    return `boards[${index}]: missing or invalid id`;
  }
  if (!Array.isArray(b.cards)) {
    return `boards[${index}]: missing cards array`;
  }
  return null;
}

function migrateEnvelope(data: ExportEnvelope): ExportEnvelope {
  let envelope = { ...data };

  // Future migrations go here, chained by version:
  // if (envelope.version === 1) { envelope = migrateV1toV2(envelope); }

  return envelope;
}

export async function importAll(
  data: unknown,
  mode: "merge" | "replace" = "merge",
): Promise<ImportResult> {
  const validationError = validateEnvelope(data);
  if (validationError) return validationError;

  let envelope = data as ExportEnvelope;
  envelope = migrateEnvelope(envelope);

  const db = getDb();
  const { bets, boards } = envelope.tables;

  try {
    await db.transaction("rw", db.bets, db.boards, async () => {
      if (mode === "replace") {
        await db.bets.clear();
        await db.boards.clear();
      }

      if (bets.length > 0) await db.bets.bulkPut(bets);
      if (boards.length > 0) await db.boards.bulkPut(boards);
    });

    return { ok: true, counts: { bets: bets.length, boards: boards.length } };
  } catch (err) {
    return {
      ok: false,
      error: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function downloadExport(envelope: ExportEnvelope): void {
  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `alphabeta-export-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readImportFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error("File is not valid JSON"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
