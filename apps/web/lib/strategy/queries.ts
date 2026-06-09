// Dexie-backed query layer for strategy boards. One row per board; full
// BoardState (cards + connections) lives inline as a JSON blob — Dexie
// handles object storage natively, so no JSON.stringify needed. Top-level
// fields are indexed for list/lookup; the rest is opaque to the DB.
//
// Persistence is debounced by callers (useBoardState's SAVE_DEBOUNCE_MS
// upstream); this module just provides the atomic write API.

import { getDb } from "@/lib/db";
import type { BoardRow, BoardState } from "@/lib/strategy/types";
import { uuid } from "@/lib/uuid";

export async function mintBoard(initial: BoardState): Promise<BoardRow> {
  const now = new Date().toISOString();
  const row: BoardRow = {
    id: uuid(),
    ownerId: null,
    ...initial,
    createdAt: now,
    updatedAt: now,
  };
  await getDb().boards.add(row);
  return row;
}

export async function getBoard(id: string): Promise<BoardRow | undefined> {
  return getDb().boards.get(id);
}

export async function listBoards(): Promise<BoardRow[]> {
  return getDb()
    .boards.orderBy("updatedAt")
    .reverse()
    .toArray();
}

export async function saveBoard(
  id: string,
  patch: Partial<BoardState>,
): Promise<void> {
  const existing = await getDb().boards.get(id);
  if (!existing) throw new Error(`Board not found: ${id}`);
  await getDb().boards.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBoard(id: string): Promise<void> {
  await getDb().boards.delete(id);
}
