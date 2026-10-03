> **Module brief** (reference). This is the spec of app #10 Reklamo, copied from the monorepo's `docs/projects/10-reklamo.md`. Its paths and ports are that app's. In P6 Negosyo Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 10 · Reklamo

| | |
|---|---|
| **App** | `apps/10-reklamo` · dev port 5110 · preview 6110 · extras: `ai` (`@huggingface/transformers`), `table` (`@tanstack/react-table` v8) |
| **Batch** | 3 |
| **Proposal** | `docs/proposal.md` (#10 in the monorepo's `docs/PROPOSALS.md`) ★AI · documented need: "no public complaint form or business-violation lookup" |
| **Reused by platforms** | P6 Negosyo Catbalogan (stretch module "public registry and complaints"; see "Platform hooks") |
| **Data** | boundary, barangays · 🟢 HDX/OCHA boundaries · synthetic business registry, permits and violations (seed 1001) and complaints with desk events (seed 1002) · authored complaint categories with English, Filipino and Waray example phrases |
| **AI in the app** | ★AI in-browser complaint categorisation: sentence embeddings (`Xenova/multilingual-e5-small`, fetched once into this app's `models/` with `npm run fetch-models -- --model e5`, served from `/models/`) + nearest centroid, in a Web Worker (skill `offline-ai`). A suggestion the citizen confirms; keyword fallback when the model is absent |
| **Skills to use** | `offline-ai`, `maplibre-gis` (cluster map), `gsap-motion` (light: stepper line, tracking-number reveal), Design plugin `ux-copy` (form, status and AI-suggestion wording) and `accessibility-review` |

> Anyone can file a complaint against a business in their own language, get a tracking number, and look up whether that business has a valid permit and a record of violations, while an AI running on their own device suggests the right category without sending a word anywhere.

## Problem

Only staff can file complaints against businesses, and citizens can't check a business's permit status or violations (PROPOSALS #10; "Documented needs"). Complaints arrive as free text in Waray, Filipino or English, so the office spends time sorting them before anyone acts, and nobody sees where problems cluster. Reklamo gives citizens a public form with a tracking number, a registry lookup and a complaint map. Categorisation runs on the citizen's device with no API and no data leaving it, and a person always confirms the category.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Citizen | `/` | phone-width window (design at 390 px) | File a complaint with photos; get a tracking number |
| Citizen | `/track`, `/track/:code` | same | Status of a complaint |
| Citizen / anyone | `/business`, `/business/:id` | laptop | Permit status, violations and complaint counts of a business |
| Anyone / the office | `/map` | laptop | Where complaints cluster, by category |
| Consumer-protection desk (staff) | `/desk` | laptop window | Review complaints and update their status |
| Builder / judge | `/ai-check` | laptop | AI vs keyword accuracy on a labelled eval set, per language |
| Anyone | `/sources` | — | Attribution, the synthetic-data note, disclaimer |

Use `AppShell width="phone"` for `/` and `/track*`, `width="wide"` for the rest; `showReset` everywhere; `layers={["boundary", "barangays"]}`. Nav: File a complaint (`/`), Track (`/track`), Businesses (`/business`), Map (`/map`), Desk (`/desk`), Data sources (`/ai-check` is linked from `/sources`, not the nav). Unknown codes and ids show an `EmptyState` with a search box. When running the smoke gate, also pass `--route /business --route /map --route /desk --route /ai-check --route /track/RK-0001`.

## MVP requirements

Build in this order. R10.1 alone is a complete entry: a public complaint form with tracking and a desk that updates it.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R10.1 | **File a complaint, get a tracking number, follow its status** | `/` form (react-hook-form + zod): business (type-ahead with a plain substring match on name, code and barangay over the registry; or "Not listed" + a barangay from the layer), what happened (20–1,000 characters), date of incident (not in the future), category (select, required; R10.3 adds the suggestion), and up to 3 photos (`<input type="file" accept="image/*" capture="environment">`, checked with `validatePhotos`; previews via `URL.createObjectURL`, revoked on remove and unmount). Photos are **never stored or uploaded**: the record keeps only the count, and the form says "Photos stay on this device in this prototype." There are no name or contact fields; the tracking number is the only handle ("Keep this number"). Submit → `RK-0061` (continuing after the seeded ones), shown large with a Copy button, then `/track/RK-0061`: a stepper Received → Under review → Inspection scheduled → Resolved or Dismissed, with dates and the desk's outcome. `/desk` is a TanStack table (newest first by default; sortable by date; filter by status, category and barangay; search by tracking number) with one action per row to move the complaint on; **Resolved** needs an outcome (warning issued, fined, permit suspended, no violation found) and **Dismissed** a reason (duplicate, not enough detail, outside the city's jurisdiction, referred to another agency). A change made in `/desk` shows on `/track/:code` in another window within 1 s, without reload. The form writes only the filed store; the desk writes only the desk store. |
| R10.2 | **Business lookup** | `/business`: TanStack table of the 80 synthetic businesses: code, name (e.g. "Sari-sari Store #12"), kind, barangay, permit badge ("Valid until {date}" / "Expired since {date}" / "Renewal pending" / "No permit on record", always icon + text), violations in the last 12 months, open complaints. Global search, sortable headers (`aria-sort`), filter chips by permit status, 20 rows per page. `/business/:id`: the same facts, violations in the last 12 months by category (plain bars), the business's complaints as tracking number, category, status and month only (**never another citizen's text**), and **File a complaint about this business**, which opens `/` with the business preselected. |
| R10.3 | **★AI category suggestion the citizen confirms** | While the citizen types (debounced 400 ms, at least 4 words), the worker embeds the text and `rankCategories` compares it with one centroid per category built from the example phrases in `src/content/categories.ts`. When `suggest()` clears the thresholds, a chip appears: "Looks like: Short weight or measure", with **Use this** and the runner-up as a second button. The category select is **never filled without a tap**. The chip says where the suggestion came from: "Suggested on this device by AI" or "Suggested by keyword match" (the fallback, used while the model is missing, loading or failed; that is a normal state with a small "AI off" badge, never a console error). Under the chip: "AI understands English and Filipino best; Waray suggestions are weaker. Please check." The complaint stores `suggestion { category, source: "ai" or "keyword", score }` and `accepted` (whether the final category equals it). `/ai-check` runs the held-out eval set (`src/content/eval.ts`) through both methods and shows top-1 accuracy per language and method, plus a **Simulate model missing** switch (in memory: it survives in-app navigation and clears on reload); record the numbers in `NOTES.md`. |
| R10.4 | **Complaint cluster map** | `/map`: complaints (seeded + filed) grouped by barangay with `clusterByBarangay`, drawn as circles at each barangay's interior point (`turf.pointOnFeature`) with a radius that grows with √count and a color for the dominant category (a `<Source>` + `<Layer type="circle">` from `@rcene/map` with expression paint, `beforeId={SLOT.points}`). Counts appear as `aria-hidden` HTML `<Marker>`s, never `symbol` text layers (no glyphs offline). Filters: category and status (open / all). Clicking a circle lists that barangay's businesses with complaint counts, linking to `/business/:id`. A "Table" tab shows the same numbers, so the map is never the only way in; the legend pairs each category color with its name. |
| R10.5 | **Language toggle, `/sources`, disclaimer** | EN / Waray / Filipino via `useLang`, persisted; all UI text and category labels from `src/i18n/strings.ts`. `/sources` uses `SourcesPage` (boundaries: OCHA/HDX) plus a "Synthetic data" entry (in `extra`, tier `synthetic`): "Businesses, permits, violations and complaints are generated by this app (seeds 1001 and 1002); business names are generic labels, not real businesses." and an "AI model" entry: `Xenova/multilingual-e5-small` (MIT license), runs in the browser, nothing is sent anywhere. Override `app.disclaimer` in `src/i18n/strings.ts` (`AppShell strings={strings}` passes it to the footer and `/sources`): "Prototype. Businesses, permits, violations and complaints are synthetic; AI-suggested categories are confirmed by a person." |

## Domain functions (test-first in `src/domain/`)

Functions take `now` as an argument; build test times with `new Date(y, m, d)` (local), never `Z` strings.

- **Types.** `Category = "overpricing" | "shortWeight" | "expiredGoods" | "unsanitary" | "noReceipt" | "noise" | "noPermit" | "wasteDisposal" | "other"`. `Business { id: string; name; kind; barangay; lngLat: LngLat; permit: { validUntil: number | null; renewalPending: boolean }; violations: { category; at: number; outcome }[] }`. `Complaint { code; businessId: string | null; barangay; category; text; incidentDate: number; photoCount: number; createdAt: number; suggestion?: { category; source: "ai" | "keyword"; score: number }; accepted?: boolean }`. `Status = "received" | "underReview" | "inspection" | "resolved" | "dismissed"`. `DeskEvent { code; to: Status; at; note?: string }`.
- `cosine(a, b)`, `meanVector(vectors)` (normalised) and `rankCategories(vec, centroids: Record<Category, number[]>): { category; score }[]` (highest first). Cases with tiny hand-made 3-d vectors; ties keep the category order.
- `suggest(ranked, { minScore, minMargin }): { category; score; runnerUp?: Category } | null`: null when the top score < `minScore` or the gap to the second < `minMargin`. Cases for both thresholds and a clear winner.
- `normalizeText(s)`: lowercase, strip diacritics and punctuation, collapse spaces.
- `keywordSuggest(text, keywords = KEYWORDS): { category; hits: number } | null`: the category with the most keyword hits; zero hits or a tie → null. Cases: for **every category, at least one English, one Filipino and one Waray example phrase** from `categories.ts` is classified correctly (a self-consistency test, so the lists stay in step); a text with no keyword → null; a tie → null; case and diacritics don't matter.
- `validatePhotos(files: { type: string; size: number }[]): { ok: true } | { ok: false; reason: "notImage" | "tooBig" | "tooMany" }`: images only, ≤ 10 MB each, ≤ 3. One case each.
- `permitStatus(permit, now): "valid" | "expired" | "pendingRenewal" | "none"`: `validUntil` null → none; `renewalPending` → pendingRenewal; `validUntil ≥ now` → valid; else expired. Case: the last valid day is still valid.
- `currentStatus(complaint, events): { status: Status; history: { to; at; note? }[] }`: received → underReview → inspection → resolved; dismissed from any non-final step; nothing after resolved or dismissed; skipped steps are ignored. Cases for each.
- `businessSummary(business, complaints, events, now): { permit; violations12m: number; violationsByCategory; open: number; closed: number }`. Cases: a violation 13 months old is excluded; a dismissed complaint is not open.
- `clusterByBarangay(complaints, businesses, { categories?, openOnly? }, events): { barangay; count; byCategory; dominant: Category }[]`. Cases: a complaint without a business uses its own barangay; filters apply; a dominant-category tie goes to the category order.
- `nextTrackingCode(complaints): string` → `RK-0061` after `RK-0060` (`code("RK", n)` from `@rcene/data`).
- `seedRegistry(rng, barangays)` and `seedComplaints(rng, businesses, dayStart)`: deterministic for seeds 1001 and 1002 (barangay names sorted first).

### On-device AI (skill `offline-ai`)

- Worker `src/ai/embed.worker.ts` loads `Xenova/multilingual-e5-small` (dtype `q8`, wasm) from `/models/` only (`env.allowRemoteModels = false`, local model path `/models/`, ONNX Runtime files from `/models/ort/`; the skill has the exact setup). Mean pooling, normalised. e5 expects a prefix: use `"query: "` on both the example phrases and the citizen's text (a symmetric comparison).
- At start the worker embeds every example phrase once and keeps the category centroids in memory; then it answers `{ id, text } → { id, ranked }`. The UI never waits on it: the form works the moment it renders.
- `useCategorizer(): { status: "loading" | "ready" | "missing" | "error"; rank(text): Promise<ranked> }`. `missing` is a normal state (keyword fallback), not an error.
- Thresholds `MIN_SCORE` and `MIN_MARGIN` live in `src/ai/config.ts`. e5 similarities sit in a narrow, high band, so tune both on `/ai-check` and record the values and accuracy in `NOTES.md`.
- Vitest never loads the model: all AI logic is tested with fake vectors.
- If `npm run fetch-models -- --model e5` can't download in your environment, build with the fallback working, keep the worker compiled and typed, and write in `STATUS.md` that the model path must be checked on the demo laptop.

## Data

- `useLayer("boundary")`, `useLayer("barangays")`. Works on fixtures until the real data lands; the "Sample data" badge shows meanwhile.
- Synthetic (`src/domain/seed.ts`), **computed at load in every window and never written to a store**, with timestamps anchored to the start of today (local) and all before it, so every window computes the same seed:
  - 80 businesses `B-0001…B-0080` (`createRng(1001)`), kinds: Sari-sari Store, Carinderia, Bakery, Rice Retailer, Meat Stall, Fish Stall, Pharmacy, Hardware, Water Refilling Station, Videoke Bar, Laundry Shop, Vulcanizing Shop. Name = kind + " #" + a per-kind number (generic labels, never real business names). Barangay picked from the layer; location = one `randomPointsIn` point inside that barangay. Permits: about 65 % valid, 15 % expired, 12 % renewal pending, 8 % none. 0–4 violations over the last 24 months in categories plausible for the kind (videoke → noise, rice retailer → short weight, carinderia → unsanitary, pharmacy → expired goods, …).
  - The generator guarantees one demo business: a Rice Retailer with an expired permit and at least 2 short-weight violations in the last 12 months (test it; record its id in `DEMO.md`).
  - 60 complaints `RK-0001…RK-0060` (`createRng(1002)`) over the last 90 days, at every status, with the desk events that put them there, concentrated so that 2–3 barangays clearly cluster (the demo retailer's barangay has the most). Their texts are drawn from their category's example phrases (so the desk shows complaints in all three languages), never personal details.
- Authored `src/content/categories.ts`: the 8 categories, each with label keys, **3 English + 3 Filipino + 3 Waray example phrases** and keyword lists per language, plus "other" (a label only: no examples, never suggested) (Filipino and Waray drafted by AI and listed in `NOTES.md` under "Translations to review"). `src/content/eval.ts`: at least 24 held-out labelled phrases (one per category per language), not copies of the examples.
- Stores, one writer per entity:
  - `createSyncedStore("10-reklamo:filed", …, { version: 1 })` → `{ complaints: Complaint[] }`. Written only by `/`.
  - `createSyncedStore("10-reklamo:desk", …, { version: 1 })` → `{ events: DeskEvent[] }`. Written only by `/desk`.
  - Photos and object URLs live only in component state. Statuses, summaries and clusters are derived from seed ∪ stores.

## Experience

- Civic but warm: a short one-column form with big touch targets on the phone, dense tables on the laptop.
- **Wow moment:** the citizen types a Waray sentence about being shortchanged on rice; a moment later a chip glides in (Motion) "Looks like: Short weight or measure · Suggested on this device by AI". **Use this** fills the select; on submit the tracking number reveals (GSAP). In `/desk`, "Inspection scheduled" advances the citizen's stepper live. Then `/business/:id` shows an expired permit and the violation bars, and `/map` shows that retailer's barangay as the largest circle. One element, one library.
- **Accessibility:** the suggestion chip is a real button with a full label; status changes are announced politely; permit badges and map categories are color + icon + text; sortable headers use `aria-sort`; the map has a table twin; photo previews have alt text ("Photo 1 of 2"); all touch targets ≥ 44 px; `prefers-reduced-motion` respected.

## Golden-path demo (≤ 2 minutes)

Setup: two windows on port 5110: A `/` at phone width, B `/desk`. Run `npm run fetch-models -- --model e5` beforehand (once, online). Press **Reset demo** first.

1. A: business "Rice Retailer #…" (record the id in `DEMO.md`) → type the Waray short-weight phrase from `eval.ts` → the AI chip suggests Short weight or measure → **Use this** → attach a photo (preview) → Submit → `RK-0061`.
2. B: RK-0061 is at the top → **Under review** → **Inspection scheduled**. A's `/track/RK-0061` advances live.
3. `/business/:id` for that retailer: "Expired since …", short-weight violations in the last 12 months.
4. `/map`: the retailer's barangay is the largest circle; filter "Noise" and another barangay stands out.
5. `/ai-check`: turn on **Simulate model missing** → back on `/`, typing gives a keyword suggestion instead. Show the accuracy table: Waray lower, said plainly.
6. Switch to Waray in A.
7. Open `/sources`.

## Definition of done

- [ ] R10.1–R10.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current
- [ ] With `/models/` absent the app still works on the keyword fallback, with no console errors

## Out of scope

- Real business names, DTI or BPLO data; uploading photos; complainant identity or contact details.
- Notifications, legal case management, automatic routing to other agencies.
- Any remote AI API or LLM; cross-device sync.

## Stretch (only after the definition of done is met)

- S1 Duplicate hint: when a new complaint's embedding is very close to an open complaint about the same business, show "A similar complaint, RK-0042, is already under review."
- S2 Business-level points with MapLibre's built-in GeoJSON clustering (circle layers only) as a second map mode.
- S3 Desk tile "AI suggestion accepted: X of Y" (`StatTile countUp`): a poster number.
- S4 Export the desk table as CSV (`toCsv` from `@rcene/data`, `downloadCsv` from `@rcene/ui`).

## Platform hooks

- Export `routes`.
- Export `ComplaintForm` (with an optional `businessId` prop), `RegistryTable`, `BusinessCard`, `ComplaintMap`, `useCategorizer` and the domain functions, free of app globals (the registry comes in as a prop).
- P6's "public registry and complaints" module mounts `/business` and `/` and links each business to its registry id; keep `Business.id` stable and the registry generator exported.
