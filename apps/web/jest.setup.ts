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
