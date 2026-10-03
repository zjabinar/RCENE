/**
 * Root tests: the repo scripts only (hooks, data tools). Each app runs its own
 * tests with its own config (`pnpm -r test`, or `npm test` inside an app).
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.mjs"],
    environment: "node",
  },
});
