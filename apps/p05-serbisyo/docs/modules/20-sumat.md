> **Module brief** (reference). This is the spec of app #20 Sumat, copied from the monorepo's `docs/projects/20-sumat.md`. Its paths and ports are that app's. In P5 Serbisyo Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 20 · Sumat

| | |
|---|---|
| **App** | `apps/20-sumat` · dev port 5120 · preview 6120 · extras: `fuse` (`fuse.js`), `ai` (`@huggingface/transformers`) |
| **Batch** | 2 |
| **Proposal** | `docs/proposal.md` (#20 in the monorepo's `docs/PROPOSALS.md`) ★AI · documented need: "no Waray/Filipino localisation" |
| **Reused by platforms** | P5 Serbisyo Catbalogan (workflow step 1: "a resident finds a service by describing it in Waray, Filipino or English"; see "Platform hooks") |
| **Data** | no map layers (`dataNeeds` is empty) · authored Citizen's Charter subset (`src/content/services.ts`, 26 generic LGU services, illustrative) and labelled test queries · tier: authored (a real Citizen's Charter is a 🟢 public document; this subset is written for the prototype, not copied) |
| **AI in the app** | ★AI semantic re-ranking with an in-browser multilingual embedding model (`Xenova/multilingual-e5-small`, fetched once into this app's `models/` with `npm run fetch-models -- --model e5`, served from `/models/`) in a Web Worker (skill `offline-ai`). Fuse.js search always works without it |
| **Skills to use** | `offline-ai`, Motion `layout` (result re-rank), `gsap-motion` (light), Design plugin `ux-copy` (plain-language service text) and `accessibility-review` (WCAG AA, large text, read-aloud) |

> Say what you need the way you'd say it at the counter, like "I need a cedula", in Waray, Filipino or English, and get the right office, steps, requirements, fee and time, in large text and read aloud.

## Problem

The LGU portal has no Waray/Filipino/English localisation, which is a government mandate, and its public forms lack accessibility basics (PROPOSALS #20; "Documented needs"). A Citizen's Charter lists services under official titles ("Issuance of Community Tax Certificate") that residents never type; they ask "how do I get a cedula?" or describe their situation ("my baby was just born"). Seniors and residents with low vision or limited reading are served worst. Sumat finds the service from everyday words in any of the three languages, explains it in plain language, and reads it aloud, all offline.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Resident | `/` | phone-width window (design at 390 px) | Type a need in any of the three languages, or browse by office |
| Resident | `/s/:id` | same | One service: steps, requirements (tickable), office, fee, time; read aloud; large text |
| Builder / judge | `/ai-check` | laptop | Fuse vs Fuse + AI on the labelled queries, per language |
| Anyone | `/sources` | — | What the content is, the model, the disclaimer |

Use `AppShell width="phone"` for `/` and `/s/:id`, `width="wide"` for `/ai-check` and `/sources`; `layers={[]}` (no "Sample data" badge). Put the large-text control in `AppShell actions`. Nav: Find a service (`/`), Data sources (`/ai-check` is linked from `/sources`). An unknown `:id` shows the search with "We couldn't find that service". When running the smoke gate, also pass `--route /s/cedula --route /ai-check`.

## MVP requirements

Build in this order. R20.1 alone is a complete entry: plain-language search over a service catalogue with full service pages.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R20.1 | **Plain-language search** and service pages | `/`: one large search box with a visible label, focused on load; results update as you type (debounce 150 ms) using Fuse.js over titles, keywords, everyday example phrasings and summaries **in all three languages**, after `normalizeQuery`. Up to 5 result cards: title in the UI language, office, fee, processing time, and a "Matched: {word}" hint. An empty query shows example chips (one per language) and **Browse by office** (every service grouped by office). No match → `EmptyState` with "Try other words" and the office list, never a blank page. `/s/:id`: title, who may apply, numbered steps, requirements as checkboxes (ticks persist), office and where to find it, fee ("Free", an amount, or "Varies: computed by the office"), processing time, and "Illustrative: check the office's posted Citizen's Charter." Unit test: for the "keyword" half of `src/content/queries.ts`, the expected service is in Fuse's top 3 for ≥ 90 % of queries. |
| R20.2 | **Three languages, content included** | Every UI string comes from `src/i18n/strings.ts`, and every service's title, summary, who-may-apply, steps, requirements, keywords and example phrasings exist in `en`, `fil` and `war` in `src/content/services.ts` (Filipino and Waray drafted by AI and listed in `NOTES.md` under "Translations to review"). Content renders with a matching `lang` attribute (`lang="war"`, `"fil"` or `"en"`). A query in one language finds services while the UI is in another; results always render in the UI language. A test checks that no service is missing a language or has a different number of steps across languages. |
| R20.3 | **★AI semantic re-ranking** | The worker embeds every service once at start (title + summary + example phrasings, one vector per language), then each query (debounce 300 ms). `combineScores` merges the Fuse and semantic candidates; the list re-orders with Motion `layout`, and a badge "Re-ranked on this device by AI" appears. Fuse results always render first and are never blocked by the model. While the model is loading, missing or failed: Fuse only, a small "Smart search off" badge, and no console error. `/ai-check` runs every labelled query through Fuse alone and Fuse + AI and shows top-1 and top-3 hit rates per language and per half (keyword / paraphrase), with a **Simulate model missing** switch (in memory: it survives in-app navigation and clears on reload); record the numbers in `NOTES.md` and say plainly where Waray is weaker. |
| R20.4 | **Read aloud** | On `/s/:id`, **Read aloud** (shown only when `speechSynthesis` exists; otherwise a one-line note "Read-aloud isn't available in this browser") speaks the title, the summary, each step, the requirements, the fee and the time as **separate utterances** (`readAloudScript`; separate utterances also avoid long-utterance cut-offs). The part being read is highlighted (`onstart`), marked `aria-current`, and scrolled into view. Controls: Pause/Resume, Stop, speed 0.8× / 1× / 1.2×. The voice comes from `pickVoice(voices, lang)` (re-run on `voiceschanged`): local voices only (`localService`, so it works offline); Filipino accepts `fil` and `tl` tags; Waray has no voice on common devices, so Waray text is read with a Filipino voice and the page says "No Waray voice on this device; reading with a Filipino voice." No suitable voice at all → the button is disabled with the reason, and an English voice is offered if one exists. Speech stops on route change. Nothing auto-plays. |
| R20.5 | **Large text and WCAG AA** | A **Text size** control (`toggle-group`: 100 % / 125 % / 150 %) sets the root font size and persists. At 150 % and 390 px width nothing scrolls horizontally (check the smoke screenshots), and every control stays usable. Also: axe clean, AA contrast, visible focus rings, touch targets ≥ 44 px, headings in order, the result count announced in an `aria-live="polite"` region ("5 services found"), icons always with a text label, no time limits, `prefers-reduced-motion` respected (the re-rank becomes an instant re-order). |
| R20.6 | **`/sources` and disclaimer** | `/sources` uses `SourcesPage` plus a "Content in this app" card (as `children`): the service catalogue is an illustrative subset written for this prototype, modelled on the structure of a Citizen's Charter (a public document), not copied from Catbalogan's; and an "AI model" entry: `Xenova/multilingual-e5-small` (MIT license), runs in the browser, nothing is sent anywhere. Override `app.disclaimer` in `src/i18n/strings.ts` (`AppShell strings={strings}` passes it to the footer and `/sources`): "Prototype. Services, fees and processing times are illustrative; check the office's posted Citizen's Charter." |

## Domain functions (test-first in `src/domain/`)

- **Types.** `Lang` from `@rcene/i18n`. `Service { id; office: OfficeId; title: Record<Lang, string>; summary: Record<Lang, string>; whoMayApply: Record<Lang, string>; steps: Record<Lang, string[]>; requirements: Record<Lang, string[]>; keywords: Record<Lang, string[]>; examples: Record<Lang, string[]>; fee: { amount: number | null }; time: { value: number; unit: "minutes" | "hours" | "days" } }` (`amount: 0` = free, `null` = varies). `Hit { id; score: number; source: "fuse" | "ai" | "both"; matched?: string }`.
- `normalizeQuery(q): string`: lowercase, strip diacritics and punctuation, remove filler phrases from `src/content/fillers.ts` (per language; English ones like "i need", "how do i get", "where can i", "how to"), collapse spaces. Cases: "I need a cedula!" → "cedula"; accents are removed; a filler-only query → "".
- `buildIndex(services)` and `searchFuse(index, q, limit = 10): Hit[]`. One Fuse record per service per language; keys and weights: keywords 3, title 2, examples 1.5, summary 0.5; `threshold: 0.35`, `ignoreLocation: true`, `includeScore`, `includeMatches`. Results are de-duplicated by service id, keeping the best score. Cases: an exact keyword ranks first; the misspelling "sedula" still finds `cedula`; the same service matched in two languages appears once; an empty query → [].
- `semanticRank(queryVec, serviceVecs: Record<string, number[][]>): { id; sim: number }[]`: a service's similarity is the maximum over its language vectors. Cases with tiny fake vectors.
- `combineScores(fuse: Hit[], semantic: { id; sim }[], { alpha = 0.6, minSemantic = 0.7 }): Hit[]`. Semantic similarities are min–max normalised over all services for the query (e5 similarities sit in a narrow band); `fuseSim = 1 − fuse score` (0 when absent); `final = alpha × semNorm + (1 − alpha) × fuseSim`; a semantic-only candidate needs `semNorm ≥ minSemantic`; sort by `final`, ties by Fuse rank then id; `source` says which method found it. Cases: `alpha = 0` keeps the Fuse order; a strong semantic-only hit enters the top 3; a weak semantic-only hit is dropped; `source` is right.
- `pickVoice(voices: { name; lang; localService; default }[], lang: Lang): { voice; readsAs: Lang } | null`. Cases: a local voice beats a remote one, and a remote-only list → null; `en` prefers `en-PH`, then the default English voice; `fil` accepts `fil-PH`, `fil`, `tl-PH` and `tl` (case- and `_`/`-`-insensitive); `war` → a Filipino voice with `readsAs: "fil"`; no Filipino voice → null for `fil` and `war`; an empty list → null.
- `readAloudScript(service, lang, t): { id: string; text: string }[]`: title, summary, "Step 1. …" per step, requirements as one sentence, fee, time. Cases: one item per step, numbered from 1; a fee of 0 reads "Free"; `null` reads "varies"; stable order.
- `formatFee(fee, lang, fmt)` and `formatTime(time, lang, t)`. One case each per state.
- Content tests: every service has all three languages with equal step counts; ids are unique; every query in `queries.ts` points to an existing id.

### On-device AI (skill `offline-ai`)

- Worker `src/ai/embed.worker.ts` loads `Xenova/multilingual-e5-small` (dtype `q8`, wasm) from `/models/` only (`env.allowRemoteModels = false`, local model path `/models/`, ONNX Runtime files from `/models/ort/`; the skill has the exact setup). Mean pooling, normalised. e5 expects prefixes: `"passage: "` for service texts and `"query: "` for the resident's query.
- At start the worker embeds the 26 × 3 service texts once (show a quiet "Preparing smart search…" line, never a blocking spinner), then answers `{ id, query } → { id, sims }`. #10 Reklamo uses the same model files.
- `useSemantic(): { status: "loading" | "ready" | "missing" | "error"; rank(q): Promise<{ id; sim }[]> }`. `missing` is a normal state, not an error.
- Vitest never loads the model: all ranking logic is tested with fake vectors.
- If `npm run fetch-models -- --model e5` can't download in your environment, build with Fuse only working, keep the worker compiled and typed, and write in `STATUS.md` that the model path must be checked on the demo laptop.

## Data

- No `@rcene/data` layers and no synthetic records.
- `src/content/offices.ts`: office id, name (three languages), where to find it ("City Hall, ground floor": illustrative) and hours. Office ids `treasurer`, `civilRegistry`, `bplo` and `assessor` match #7 Pila's, for P5.
- `src/content/services.ts`: 26 services (fees and times plausible and illustrative; when a fee depends on an assessment, use `amount: null`):

  | id | Office | Service |
  |---|---|---|
  | `cedula` | City Treasurer | Community tax certificate (cedula) |
  | `rpt-payment` | City Treasurer | Pay real property tax |
  | `business-tax-payment` | City Treasurer | Pay business tax and fees |
  | `birth-registration` | Civil Registry | Register a newborn's birth |
  | `late-birth-registration` | Civil Registry | Late registration of birth |
  | `civil-record-copy` | Civil Registry | Certified copy of a birth, marriage or death record |
  | `marriage-license` | Civil Registry | Apply for a marriage license |
  | `death-registration` | Civil Registry | Register a death |
  | `clerical-correction` | Civil Registry | Correct a clerical error in a civil registry record |
  | `business-permit-new` | BPLO | New business permit |
  | `business-permit-renewal` | BPLO | Renew a business permit |
  | `business-closure` | BPLO | Close (retire) a business |
  | `tax-declaration-copy` | City Assessor | Certified copy of a tax declaration |
  | `tax-declaration-transfer` | City Assessor | Transfer a tax declaration to a new owner |
  | `building-permit` | Office of the Building Official | Building permit |
  | `occupancy-certificate` | Office of the Building Official | Certificate of occupancy |
  | `zoning-clearance` | City Planning and Development Office | Locational (zoning) clearance |
  | `sanitary-permit` | City Health Office | Sanitary permit |
  | `health-certificate` | City Health Office | Health certificate for food handlers |
  | `senior-id` | Office of Senior Citizens Affairs | Senior citizen ID |
  | `pwd-id` | Persons with Disability Affairs Office | ID for persons with disability |
  | `solo-parent-id` | City Social Welfare and Development Office | Solo parent ID |
  | `financial-assistance` | City Social Welfare and Development Office | Medical or burial assistance |
  | `job-seeker` | Public Employment Service Office | Register as a job seeker |
  | `anti-rabies` | City Veterinary Office | Free anti-rabies vaccination for pets |
  | `barangay-certificates` | Your barangay hall | Barangay clearance, indigency or residency certificate (#8 Sertipiko) |

- `src/content/queries.ts`: at least 36 labelled queries, 12 per language: 6 "keyword" (uses the service's own words, e.g. "I need a cedula") and 6 "paraphrase" (describes a situation, e.g. "my baby was born last week" → `birth-registration`, "my father passed away" → `death-registration`, "I lost my birth certificate" → `civil-record-copy`, "we are getting married" → `marriage-license`, "I just turned 60" → `senior-id`, "I'm looking for work" → `job-seeker`). Filipino and Waray queries are written natively, not translated word for word, and listed for review. Paraphrases must not copy a service's `examples`.
- Store `createSyncedStore("20-sumat:prefs", …, { version: 1 })` → `{ textScale: 1 | 1.25 | 1.5; rate: 0.8 | 1 | 1.2; checked: Record<string, number[]>; recent: string[] }` (ticked requirement indexes per service; the last 5 services opened). One writer per window, and these are personal preferences, so last-write-wins between windows is fine. Language comes from `useLang`.

## Experience

- Calm, high-contrast and roomy, designed for a senior on a phone: one big search box, large result cards, plain verbs ("Bring", "Go to", "Pay").
- **Wow moment:** type "my baby was born last week". Fuse shows a weak match first; a beat later the list re-orders (Motion `layout`) and "Register a newborn's birth" rises to the top with the badge "Re-ranked on this device by AI". Open it, switch to 150 % text, tap **Read aloud**: each step lights up as it is spoken.
- **Accessibility** (beyond R20.5): `lang` on every content block, so screen readers switch pronunciation; read-aloud highlights are also `aria-current`; results are a list with a count; the skip link comes with `AppShell`; speech never starts on its own.

## Golden-path demo (≤ 2 minutes)

Setup: one window on port 5120 at phone width. Run `npm run fetch-models -- --model e5` beforehand (once, online). Press **Reset demo** first.

1. `/`: type "I need a cedula" → Community tax certificate (cedula) on top → open it: steps, requirements, City Treasurer, fee, time.
2. Back; type "my baby was born last week" → the AI re-rank animation → Register a newborn's birth.
3. Type the Waray cedula query from `queries.ts` (UI still in English) → cedula found.
4. Switch to Waray → the service page in Waray.
5. Text size 150 % → the page reflows; **Read aloud** → steps highlight as they're read; the "No Waray voice" note shows.
6. `/ai-check`: Fuse vs Fuse + AI per language; Waray lower, said plainly.
7. Open `/sources`.

## Definition of done

- [ ] R20.1–R20.6 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current
- [ ] With `/models/` absent the app still works on Fuse alone, with no console errors

## Out of scope

- Applying for, booking or paying for a service (that's #7 and #8, joined in P5).
- Live office status or queues; speech input (speech recognition needs a network in most browsers).
- Translating at runtime with AI; any server, remote API or LLM.

## Stretch (only after the definition of done is met)

- S1 Language hint: when the query matched mostly Waray or Filipino fields, offer "Show this in Waray?".
- S2 Print a service's checklist (`@media print`, ticks included).
- S3 A "Voices on this device" panel on `/ai-check` listing every voice and whether it works offline.
- S4 "Related services" on each service page (nearest semantic neighbours, when the model is ready).

## Platform hooks

- Export `routes`.
- Export `ServiceSearch` (with an `onSelect(serviceId)` prop), `ServiceCard`, `ServiceDetail`, `ReadAloudButton`, `useTextScale`, `useSemantic`, the catalogue and the domain functions, free of app globals.
- P5 mounts `ServiceSearch` as step 1 and uses `onSelect` to start a #8 request (for `barangay-certificates`) or a #7 ticket for the service's office. Keep service ids stable and `office` ids aligned with #7 Pila.
