# @rcene/config

Shared build config. Apps don't import it at runtime.

- `tsconfig.app.json` / `tsconfig.node.json` — bases that each app's and package's tsconfig extends (TypeScript 6, strict, bundler resolution, `erasableSyntaxOnly`: no enums, no parameter properties).
- `@rcene/config/vite` → `rceneApp({ dir, plugins?, overrides?, port?, ai? })` — React + Tailwind v4 + the static plugin, `@` → `src/`, `strictPort`, preview on port + 1000, vitest defaults (jsdom, `src/**/*.test.ts(x)`). **The port and `ai` flag are read from `docs/projects/projects.json` by folder name**, so they live in one place.
- `@rcene/config/static` → `rceneStatic(mounts)` — serves `/data/` from `packages/data/files` then `packages/data/fixtures` (plus `/data/manifest.json`), and `/models/` from `assets/models` for AI apps. In builds the files are emitted into `dist/`, so `vite preview` works offline.

Adding a Vite plugin (e.g. PWA for app 06):

```ts
import { VitePWA } from "vite-plugin-pwa";
export default rceneApp({ dir: fileURLToPath(new URL(".", import.meta.url)), plugins: [VitePWA({ /* … */ })] });
```
