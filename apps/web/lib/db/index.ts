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
