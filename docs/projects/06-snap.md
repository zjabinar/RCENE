# 06 · Damage Snap

| | |
|---|---|
| **App** | `apps/06-snap` · dev port 5106 · preview 6106 |
| **Batch** | 4 |
| **Proposal** | `docs/PROPOSALS.md` #6 ★AI |
| **Reused by platforms** | P2 Bayanihan Response (report form with offline queue; the dashboard feeds its triage board) |
| **Data** | boundary, barangays · 🟢 HDX · synthetic: 120 seeded damage reports (seed 106) · no personal data of any kind |
| **AI in the app** | ★AI in-browser (skill `offline-ai`): zero-shot photo classification in a Web Worker suggests a damage severity, and the officer confirms or changes it. A deterministic rule-based suggestion takes over when the model is absent. |
| **Skills to use** | `offline-ai` (read first), `maplibre-gis` (deck.gl overlay), `gsap-motion` (count-ups) + Motion (sync-state cards), Design plugin `accessibility-review` and `ux-copy` |

Extra libraries already installed: `vite-plugin-pwa` (dev), `deck.gl` + `@deck.gl/mapbox`, `@huggingface/transformers`.

> Snap a damaged house with no signal, let the phone suggest how bad it is, confirm it, and watch the report land on the command-post heatmap the moment signal returns.

## Problem

Field damage assessment has to work without signal, and paper forms get re-encoded later (`docs/PROPOSALS.md` #6; the LGU portal's gap list records "field work that must survive without signal"). Re-encoding is slow and error-prone, so the command post sees damage hours late. Damage Snap captures a geotagged photo, damage category and households affected offline, queues the report, and syncs it when signal returns.

**Honesty rule:** there is no server. In this prototype, "sync" moves a report from the device outbox to the command-post dashboard dataset **in the same browser**. The UI, `DEMO.md` and the pitch say exactly that.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Field officer | `/` | phone-width window (installed PWA in rehearsal) | File a report in under 60 s with no signal |
| Field officer | `/outbox` | same | See queued and synced reports; switch the simulated signal |
| CDRRMO command post | `/dashboard` | laptop window, 1280 px | Heatmap or hexbins, tallies by barangay, live updates |
| Anyone | `/sources` | — | Attribution, AI model credit, disclaimer |

Use `AppShell width="phone"` for `/` and `/outbox` and `width="wide"` for `/dashboard`. Nav: New report (`/`), Outbox (with the queued count as a badge), Dashboard, Data sources.

Smoke visits only `/` and `/sources` by default, so also run it with `--route /outbox --route /dashboard`.

Do **not** use `showReset`: the shared reset clears `localStorage` only. Put this app's own **Reset demo** button in `actions`. It clears the IndexedDB photo store, then calls `resetDemo({ keep: ["lang"] })`.

## MVP requirements

Build in this order. R6.1 alone is a complete entry: an offline field form with a local outbox.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R6.1 | **Report form + outbox** | Fields:<br>- **photo:** optional; `<input type="file" accept="image/*" capture="environment">`, with a preview<br>- **location:** required, inside the city boundary, set by tapping a small map (default), by "Use my location" (Geolocation, 8 s timeout; failure shows a message and never blocks), or by "Pick barangay instead" (searchable list; uses the barangay's `pointOnFeature`, labelled "approximate: barangay")<br>- **barangay:** auto-filled with `barangayAt`<br>- **damage category:** 7 options, as a radio group<br>- **severity:** Minor / Moderate / Severe / Destroyed, as a radio group<br>- **households affected:** integer 0–500<br>There is **no** name, phone, address or free-text field. The form says "Numbers only. Don't record names."<br>Validation uses react-hook-form + zod (`@hookform/resolvers`), with messages linked by `aria-describedby`.<br>**Save:**<br>- the photo is downscaled to ≤ 1024 px JPEG; re-encoding strips EXIF, GPS included<br>- the photo is stored in IndexedDB<br>- the report is added as `queued` with code `DR-0001`, `DR-0002`, …<br>- a toast (`@rcene/ui/components/sonner`) says "Saved to outbox. It will sync when signal returns."<br>**`/outbox`** lists reports newest first: thumbnail, code, barangay, category, severity, households and a state chip (icon + text). A report can be deleted only while queued. Everything survives a reload. |
| R6.2 | **Simulated sync** | On `/outbox`, a **Field signal (simulated)** switch, Offline by default.<br>While Online, reports go queued → syncing (≈ 700 ms) → synced one at a time, oldest first, animated with Motion (`AnimatePresence` / `layout`).<br>Switching Offline mid-sync returns `syncing` to `queued`, and a reload does the same (`recoverOnLoad`).<br>The sync loop runs **only** while `/outbox` is mounted, so there is one writer.<br>The outbox copy says: "Prototype: there is no server. Synced means added to this browser's command-post dashboard." |
| R6.3 | **Dashboard** at `/dashboard` | `BaseMap` with a deck.gl `MapboxOverlay` (interleaved), mounted through `useControl` from `@rcene/map`. A toggle switches between a `HeatmapLayer` weighted by `heatWeight` (default) and a `HexagonLayer` (radius 300 m, color by summed households, not extruded).<br>Data = **synced** reports + seeded synthetic reports, with an "Include synthetic reports" switch (default on) and a legend entry that says "Synthetic".<br>`StatTile`s with count-up: reports, households affected, severe + destroyed, and "still in field outboxes" (queued + syncing).<br>A table by barangay (reports, households, severe +), sorted by households.<br>A report synced in the field window appears in an open dashboard window in < 1 s, with a one-time pulse at its point.<br>There are no symbol or text layers: the offline basemap has no glyphs. |
| R6.4 | **Installable PWA** with an offline app shell | `VitePWA` passed through `rceneApp({ plugins: [...] })` (config under Data). In `pnpm build && pnpm preview` (port 6106):<br>- the web app manifest is valid<br>- the service worker registers<br>- Chrome offers **Install**<br>- after one full load, stopping the preview server and reloading still opens `/`, `/outbox` and `/dashboard`, with the boundary and barangay layers (precached)<br>Dev (5106) never registers a service worker (`devOptions.enabled: false`). `DEMO.md` has the "unregister a stale service worker" steps. |
| R6.5 | **★AI severity suggestion** | Choosing a photo starts classification in a module Web Worker (`src/ai/classify.worker.ts`). It runs Transformers.js `pipeline("zero-shot-image-classification", MODEL_ID)` with local models only: `env.allowRemoteModels = false` and `env.localModelPath = "/models/"`.<br>The result shows "Suggested on this device: Severe (62%)" with **Use suggestion** and the normal severity radios. The severity field is **never** set without a user action, and the suggestion is never submitted on its own.<br>**Fallback.** If the model is absent, fails or takes > 15 s, the UI shows `ruleSeverity(category, households)` as "Rule-based suggestion (AI model not available)". This fallback is deterministic.<br>The report stores `severitySource` and `aiSuggestion`.<br>Nothing under `/models/` is requested until a photo is chosen, so the first load stays light and the smoke test sees no 404s. The form stays usable while the model loads (progress text). |
| R6.6 | Language toggle EN / Waray / Filipino | Every UI string, category and severity label comes from `src/i18n/strings.ts`. The choice persists. No hard-coded UI text. The CLIP prompts in `src/ai/labels.ts` are model input, not UI text, and stay in English; a code comment says so. The PWA manifest name is config. |
| R6.7 | `/sources` and disclaimer footer on every view | `SourcesPage`, plus an app section listing: the synthetic reports (seed 106); the AI model id, its license and "runs on this device; photos never leave it". The footer comes with `AppShell`. |

## Domain functions (test-first in `src/domain/`)

**Schema and rules**

- `DAMAGE_CATEGORIES = ["housePartial", "houseTotal", "flooding", "landslide", "roadBridge", "powerComms", "otherInfra"] as const`.
- `SEVERITIES = [1, 2, 3, 4] as const`, standing for Minor, Moderate, Severe and Destroyed.
- `reportInputSchema` (zod). Cases:
  - households −1, 2.5 and 501 are rejected; 0 and 500 are accepted
  - a missing location is rejected
  - an unknown category is rejected
  - the input has no field for names
- `ruleSeverity(category: DamageCategory, households: number): Severity` uses these base values: housePartial 2, houseTotal 4, flooding 2, landslide 3, roadBridge 3, powerComms 2, otherInfra 1. It adds 1 when households ≥ 10, up to a maximum of 4. Cases: each base value; the bump at exactly 10; the cap at 4.

**AI**

- `severityFromScores(scores: { label: string; score: number }[], labelMap: Record<string, Severity>, minConfidence = 0.35): { severity: Severity; confidence: number } | null` sums the scores per severity, and the highest sum wins. Cases:
  - a clear winner
  - equal sums → the more severe level (the conservative choice)
  - a best sum below `minConfidence` → `null` ("not sure")
  - unknown labels are ignored

**Sync**

- `syncStep(reports: DamageReport[], signal: "offline" | "online", nowIso: string): DamageReport[]`.
  - Online: the report that is `syncing` becomes `synced` (with `syncedAt`). If none is syncing, the oldest `queued` report (by `createdAt`) becomes `syncing`.
  - Offline: any `syncing` report goes back to `queued`.
  - Cases: first-in first-out order; the offline revert; nothing to do → **the same array reference**; synced reports are never touched.
- `recoverOnLoad(reports: DamageReport[]): DamageReport[]` turns `syncing` back into `queued`.

**Dashboard and seeding**

- `tallyByBarangay(reports: DamageReport[]): { barangay: string; reports: number; households: number; severePlus: number }[]` sorts by households descending, then name. Cases: an empty list → `[]`; synthetic and real reports merge; severity 3 and 4 count as severe +.
- `heatWeight(r: DamageReport): number` is `Math.max(1, r.households)`. Case: a road report with 0 households still shows, with weight 1.
- `seedReports(barangays: BarangayCollection, seed = 106, n = 120, baseTime = "2026-10-07T06:00:00+08:00"): DamageReport[]`. Seeded reports are all `synced`, `synthetic: true`, with codes `SYN-0001` to `SYN-0120`. Points come from `randomPointsIn` inside their barangay. Barangays with `coastal: true` are picked three times as often. `createdAt` falls within the 24 h before `baseTime`, never using `Date.now()`. Severity comes from `ruleSeverity`. Cases:
  - exactly `n` reports
  - every point is inside its barangay (`pointInArea`)
  - the same seed gives deep-equal output
  - no string field other than the code, category and barangay
- `fitWithin(w: number, h: number, max = 1024): { w: number; h: number }`. Cases: keeps the aspect ratio; never upscales a small image.

## Data

- `useLayer("boundary")` and `useLayer("barangays")` only. Pass both to `AppShell layers`.
- **Synthetic data:** the seeded reports are regenerated at runtime from seed 106 and never persisted. They have no photos, and the UI shows an icon instead.
- **Store:** `createSyncedStore("06-snap:reports", …, { version: 1 })` with `{ reports: DamageReport[]; nextSeq: number; signal: "offline" | "online"; includeSynthetic: boolean }`. `DamageReport` has these fields:
  - identity: `id` (`crypto.randomUUID()`), `code` (`DR-0001`), `createdAt` (ISO)
  - place: `lon`, `lat`, `locationSource: "map" | "gps" | "barangay"`, `barangay`
  - assessment: `category`, `severity`, `severitySource: "manual" | "ai-confirmed" | "ai-changed" | "rule-confirmed" | "rule-changed"`, `aiSuggestion: { severity; confidence; model } | null`, `households`
  - state: `hasPhoto`, `sync: "queued" | "syncing" | "synced"`, `syncedAt?`, `synthetic?`

  Only the field window's form and `/outbox` write to it. `/dashboard` only reads.
- **Photos:** IndexedDB database `rcene-06-snap`, object store `photos`, keyed by report id, holding the JPEG `Blob`. Use a tiny hand-written wrapper in `src/lib/photo-db.ts` over raw `indexedDB` (`putPhoto`, `getPhoto`, `deletePhoto`, `clearPhotos`) with no extra library. Keep logic out of it: jsdom has no IndexedDB, so it is not unit-tested. Object URLs are revoked on unmount.
- **AI model:**
  - The model is `Xenova/clip-vit-base-patch32` with dtype `q8`, the 06 entry in `scripts/fetch-models.mjs`. Keep its id in one constant, `MODEL_ID`, in `src/ai/config.ts`.
  - Point ONNX Runtime at the local wasm files under `/models/ort/` as the `offline-ai` skill shows, so nothing is fetched from a CDN.
  - Fetch it before the event with `node scripts/fetch-models.mjs --app 06` into `assets/models/`. `@rcene/config` serves it at `/models/` because `projects.json` marks 06 `ai: true`. Follow the skill on what gets committed.
  - Labels live in `src/ai/labels.ts`, two English prompts per severity:
    - Minor: "a photo of a house with minor damage", "a photo of an intact house"
    - Moderate: "a photo of a house with a damaged roof", "a photo of debris and fallen trees"
    - Severe: "a photo of a partially collapsed house", "a photo of a flooded house"
    - Destroyed: "a photo of a completely destroyed house", "a photo of rubble"
- **Worker protocol:**
  - in: `{ type: "classify", id, blob }`
  - out: `{ type: "progress", loaded }`, `{ type: "result", id, scores }` or `{ type: "unavailable", reason }`
  - The pipeline is created once, lazily, on the first photo.
- **PWA config** (`vite.config.ts`):
  - `VitePWA({ registerType: "autoUpdate", injectRegister: "auto", devOptions: { enabled: false }, manifest: { name: "Damage Snap — Catbalogan", short_name: "Damage Snap", start_url: "/", display: "standalone", theme_color, background_color, icons: [192 and 512 PNG, plus a 512 maskable] }, workbox: { … } })`
  - `workbox`: `globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,json,geojson,woff2}"]`, `globIgnores: ["models/**"]`, `maximumFileSizeToCacheInBytes: 6 * 1024 * 1024`, `navigateFallback: "/index.html"`, and `runtimeCaching` with `CacheFirst` for `/models/`.
  - Don't import `virtual:pwa-register`, so no extra types are needed.
  - Generate the PNG icons into `public/icons/` with a small Node script in the app folder that uses `node:zlib` (a solid square with a simple mark is enough), and commit the outputs.
- **Stale service workers.** The scope is per origin, so 6106 never affects other apps. To unregister:
  - DevTools → Application → Service workers → Unregister, then Storage → Clear site data
  - or run `navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()))` in the console

## Experience

- **Field view:** phone-first, ≥ 44 px touch targets, high contrast for outdoor use. The form fits one scroll. Outbox chips: queued (cloud-off icon), syncing (spinner), synced (check), always with text.
- **Wow moment:** flip **Field signal** to Online.
  - The queued cards march through syncing → synced one by one (Motion).
  - In the dashboard window, each report lands as a pulse on the heatmap while the tiles count up (`StatTile countUp` / the `gsap-motion` count-up recipe).
  - The second beat is the photo: the AI suggestion appears a few seconds after choosing it, clearly framed as "a suggestion — you decide".
  - Motion owns the cards and GSAP the numbers: one library per element.
- **Accessibility:**
  - A keyboard-only path through the whole form via "Pick barangay instead".
  - Labelled radio groups and error messages linked to their fields.
  - A polite live region announces "Saved to outbox", each "Synced DR-0003" and the AI suggestion.
  - The heatmap is backed by the barangay table, so the map is never the only source.
  - `prefers-reduced-motion` turns the card animation and pulse into instant state changes.

## Golden-path demo (≤ 2 minutes)

Setup: `pnpm build && pnpm preview` in `apps/06-snap` (port 6106), with models fetched. Window A at phone width on `/` (the installed PWA, if rehearsed); window B at 1280 px on `/dashboard`. Press **Reset demo**. Keep two or three of the presenter's own damage photos in a local folder: no faces, no house numbers, never committed.

1. B: a heatmap of the synthetic reports, with "Synthetic" in the legend.
2. A: choose a photo. "Suggested on this device: Severe (61%)" appears; press **Use suggestion**. Category "House — partially damaged", households 4, tap the map, **Save**. A toast says "Saved to outbox".
3. A: file a second report by keyboard with "Pick barangay instead".
4. A, `/outbox`: two queued. Switch **Field signal** to Online. The cards sync one by one. In B, two new points pulse, the tiles count up and the barangay table updates.
5. B: switch to hexbins, then switch synthetic reports off. Only the two real reports remain.
6. Optional, rehearsed: stop the preview server and reload A. The app still opens, from the service worker.

## Definition of done

- [ ] R6.1–R6.7 meet their acceptance criteria
- [ ] Domain tests pass: `pnpm test` (in `apps/06-snap`)
- [ ] `pnpm typecheck` and `pnpm build` pass
- [ ] `node ../../scripts/smoke.mjs --app 06-snap` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- A real server or backend sync, and accounts.
- Triage and assignment (P2's board).
- Relief distribution (#19).
- Names, phone numbers, free-text notes, and photos of people.
- Push notifications.
- Any AI that runs off the device or sets a value without the user's confirmation.

## Stretch (only after the definition of done is met)

- Read GPS from the photo's EXIF before it is stripped, with a small hand-written parser, as another `locationSource`.
- A dashboard tile: "AI suggestion accepted in X of Y reports" (from `severitySource`). It doubles as a poster panel.
- A CSV export of synced reports (codes and numbers only).
- Register the Background Sync API where supported, in addition to the simulated switch.

## Platform hooks

- Export `routes`.
- Export the `ReportForm`, `Outbox` and `DamageDashboard` components and the pure `syncStep`, `tallyByBarangay`, `ruleSeverity` and `severityFromScores`.
- Keep the `DamageReport` store versioned, so P2 can add `triage: "new" | "verified" | "assigned"` through a migration.
- Hide the worker and the photo database behind small interfaces (`suggestSeverity(blob)`, `photoStore`), so P2 reuses them unchanged.
