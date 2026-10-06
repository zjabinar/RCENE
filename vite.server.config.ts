/**
 * Builds the production AI relay (server/api.ts) into one self-contained file,
 * dist-server/api.mjs: zod and the relay are bundled, node: built-ins stay external.
 * The VPS then runs it with plain `node`, no node_modules. `npm run build:server`.
 */
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  ssr: { noExternal: true, target: "node" },
  build: {
    ssr: "server/api.ts",
    outDir: "dist-server",
    emptyOutDir: true,
    target: "node18",
    minify: false,
    rollupOptions: { output: { entryFileNames: "api.mjs", format: "es" } },
  },
});
