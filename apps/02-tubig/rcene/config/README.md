# rcene/config

This app's build config (Node-side; the browser never imports it). It reads only this folder.

- `vite.config.ts` → `rceneApp({ dir, plugins?, overrides?, port?, ai? })` from `./rcene/config/vite.ts`:
  React + Tailwind v4 + the `/data/` plugin, the `@rcene/*` and `@/` aliases (see `rceneAliases`), `strictPort`,
  preview on port + 1000, vitest defaults (jsdom; `src/`, `rcene/`, `scripts/` tests).
  **The port and `ai` flag come from `./project.json`.**
- `static.ts` → `rceneStatic(mounts)`: serves `/data/` from `data/files` (real) then `data/fixtures` (fake), file by file,
  plus `/data/manifest.json` (which drives the "Sample data" badge); and `/models/` from `models/` when `project.json` has
  `"ai": true`. In builds the files are emitted into `dist/`, so `vite preview` works offline.
- TypeScript: `tsconfig.base.json` (shared options + `@rcene/*` paths), `tsconfig.app.json` (`src` + `rcene`, browser),
  `tsconfig.test.json` (tests), `tsconfig.node.json` (`vite.config.ts` + this folder).

`overrides` are deep-merged with Vite's `mergeConfig`. Adding a Vite plugin (e.g. a PWA):

```ts
import { VitePWA } from "vite-plugin-pwa";
export default rceneApp({ dir: fileURLToPath(new URL(".", import.meta.url)), plugins: [VitePWA({ /* … */ })] });
```

This folder is the app's own copy of the shared code; keep changes minimal and list them in `NOTES.md` under
"Shared-code changes (for the template)".
