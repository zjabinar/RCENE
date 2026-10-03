/**
 * Root test runner: `pnpm test` runs every package, app and script test.
 * Per-app runs: `pnpm --filter @rcene/<slug> test`.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "packages",
          include: ["packages/*/src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
        },
      },
      {
        test: {
          name: "scripts",
          include: ["scripts/**/*.test.mjs"],
          environment: "node",
        },
      },
      "apps/*",
    ],
  },
});
