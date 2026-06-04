// Dexie-backed storage shim for the Plinth Board state hook. The hook
// expects sync loadBoard()/saveBoard() — it was written for localStorage.
// We keep the same signatures so the hook is untouched, but route writes
// through queries.saveBoard against a module-level current board id that
// the page wires up via setCurrentBoardId() before mounting BoardProvider.
// Load is a no-op fallback: the page hydrates via queries.getBoard() and
// passes initialState into BoardProvider, so loadBoard() only fires when
// no override is given (tests, or a board that hasn't been minted yet).

import { saveBoard as dbSaveBoard } from "@/lib/strategy/queries";
import { defaultBoardState } from "@/lib/strategy/constants";
import type { BoardState } from "@/lib/strategy/types";

let currentBoardId: string | null = null;

export function setCurrentBoardId(id: string | null): void {
  currentBoardId = id;
}

export function loadBoard(): BoardState {
  return defaultBoardState();
}

export function saveBoard(state: BoardState): void {
  if (!currentBoardId) return;
  void dbSaveBoard(currentBoardId, state).catch((err) => {
    console.error("Failed to save board to Dexie:", err);
  });
}
