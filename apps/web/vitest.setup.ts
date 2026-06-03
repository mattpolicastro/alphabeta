// Wire fake-indexeddb so Dexie-backed tests get a clean in-memory DB.
// `fake-indexeddb/auto` patches globalThis with IDB shims at import time.
import "fake-indexeddb/auto";

import { afterEach, beforeEach } from "vitest";
import { __resetDb } from "@/lib/db";

// Each test gets a fresh DB. Dexie's connection cache holds a reference, so
// the queries module exposes __resetDb() that closes and clears the singleton.
beforeEach(async () => {
  await __resetDb();
});

afterEach(async () => {
  await __resetDb();
});
