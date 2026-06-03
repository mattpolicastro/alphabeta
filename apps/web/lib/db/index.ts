import { AlphabetaDB } from "./schema";

export { AlphabetaDB } from "./schema";
export type * from "./types";

// Singleton — Dexie connections are inherently shared by name within an
// origin; instantiating once keeps consumers from holding stale instances.
let _db: AlphabetaDB | null = null;

export function getDb(): AlphabetaDB {
  if (!_db) _db = new AlphabetaDB();
  return _db;
}

// Test-only hook. Closes the current Dexie connection and removes the
// underlying IndexedDB so each test gets a fresh schema/data slate.
// Production callers must never invoke this — it's exported as `__resetDb`
// (underscore prefix) to mark it as internal.
export async function __resetDb(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
  // Best-effort: delete the named DB. fake-indexeddb supports this directly.
  if (typeof indexedDB !== "undefined" && "deleteDatabase" in indexedDB) {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("alphabeta");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }
}
