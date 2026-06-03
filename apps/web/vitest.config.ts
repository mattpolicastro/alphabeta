import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Default to jsdom so React Testing Library can render components.
    // lib/ tests still run cleanly here — fake-indexeddb (auto-imported in
    // vitest.setup.ts) provides IDB shims on top of jsdom's globals.
    // Per-file override via `// @vitest-environment node` if a test ever
    // needs a clean node env.
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
