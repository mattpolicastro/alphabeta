// Polyfill structuredClone for jsdom (required by fake-indexeddb v6 + Dexie 4)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}

// Polyfill File.text() for jsdom (used by CSV parser tests)
if (typeof File.prototype.text !== 'function') {
  File.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
