// Wire fake-indexeddb so Dexie-backed tests get a clean in-memory DB.
// `fake-indexeddb/auto` patches globalThis with IDB shims at import time.
import "fake-indexeddb/auto";

// @testing-library/jest-dom extends `expect` with DOM matchers
// (.toBeInTheDocument, .toHaveTextContent, etc.) used by component tests.
import "@testing-library/jest-dom/vitest";

import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { __resetDb } from "@/lib/db";

// RTL doesn't auto-cleanup with vitest; unmount renders between tests so
// each `render()` starts fresh.
afterEach(() => {
  cleanup();
});

// Each test gets a fresh DB. Dexie's connection cache holds a reference, so
// the queries module exposes __resetDb() that closes and clears the singleton.
beforeEach(async () => {
  await __resetDb();
});

afterEach(async () => {
  await __resetDb();
});
