// Polyfill structuredClone for jsdom (required by fake-indexeddb v6 + Dexie 4)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}

import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
