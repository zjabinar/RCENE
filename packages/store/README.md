# @rcene/store

Zustand stores persisted to `localStorage` and synced across every open window of the same app — no server.

```ts
import { createSyncedStore, useHydrated, resetDemo } from "@rcene/store";

export const useCenters = createSyncedStore("03-likas:centers", (set) => ({
  live: {} as Record<string, { occupancy: number; open: boolean }>,
  arrive: (id: string, n: number) =>
    set((s) => ({ live: { ...s.live, [id]: { ...s.live[id]!, occupancy: Math.max(0, s.live[id]!.occupancy + n) } } })),
}), { version: 1 });
```

- Key: `rcene:<name>`. Name stores `<app-slug>:<store>` so platforms that combine apps on one origin never collide.
- Sync: a write in window A fires the browser `storage` event in windows B, C… which rehydrate. Rehydrating never writes back (tested), so there is no ping-pong.
- **Last write wins** for the whole persisted object. Keep one writer per entity (e.g. only `/center/:id` changes that center).
- Persist only state, never static data (layers load from `/data/`). Use `partialize` to drop UI-only fields.
- `resetDemo({ keep: ["lang"] })` clears every `rcene:*` key and reloads all windows — put it behind a "Reset demo" button for rehearsals (`AppShell showReset`).
- Multi-window demo: open the same app (same port) in several windows, e.g. `/console`, `/`, `/board`.
