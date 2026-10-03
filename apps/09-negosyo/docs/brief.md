# 09 · Negosyo Navigator

| | |
|---|---|
| **App** | `apps/09-negosyo` · dev port 5109 · preview 6109 · extras: none (core libraries only) |
| **Batch** | 2 |
| **Proposal** | `docs/proposal.md` (#9 in the monorepo's `docs/PROPOSALS.md`) · and the "risk-aware business siting" idea of P6 |
| **Reused by platforms** | P6 Negosyo Catbalogan (core: "wizard + fee estimate" and "location hazard check"; see "Platform hooks") |
| **Data** | boundary, barangays, all five `hazard-*` layers · 🟢 HDX/OCHA boundaries + 🟡 CDRRMO risk maps (permission; UP NOAH fallback recorded by the data session) · no synthetic records · authored, illustrative fee rules, requirements, steps and siting advice |
| **AI in the app** | none |
| **Skills to use** | `maplibre-gis` (siting map), `gsap-motion` (fee bars and count-up), Motion `AnimatePresence` for wizard steps and `layout` for the checklist, Design plugin `ux-copy` (siting wording, "why this applies") |

> Five questions tell a would-be business owner every clearance they need, an estimated fee breakdown, the steps and the days, and whether the lot they picked sits in a mapped storm-surge or flood zone, before they sign a lease.

## Problem

Applicants learn which clearances, documents and fees apply only when they reach the counter (PROPOSALS #9), so a permit takes several trips. Nobody tells them that the lot they are about to lease sits in a mapped storm-surge zone: eBOSS permitting and DRRM data have never been joined (P6, "risk-aware business siting"). Negosyo Navigator answers both on one screen, offline. Fee rules are re-entered as config (no code copied) and labelled as illustrative estimates; hazard answers use the three-state lookup and never call a place "safe".

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Prospective owner | `/` | phone-width window (design at 390 px) | Five questions, one per screen, Back and Next |
| Prospective owner | `/result` | laptop (map beside the lists; stacks on a phone) | Checklist, fees, steps and days, siting check |
| Prospective owner | `/print` | print preview | The checklist on at most two A4 pages |
| Anyone | `/sources` | — | Attribution and disclaimer |

Use `AppShell width="phone"` for `/`, `width="wide"` for `/result`, `/print` and `/sources`. Pass `layers={["boundary", "barangays", "hazard-flood", "hazard-landslide", "hazard-stormSurge", "hazard-groundShaking", "hazard-liquefaction"]}` so the "Sample data" badge is right. Nav: Start (`/`), My checklist (`/result`, disabled until the wizard is complete), Data sources. `/result` and `/print` with incomplete answers redirect to the first unanswered step. When running the smoke gate, also pass `--route /result --route /print` (with the wizard empty they redirect; still no console errors).

## MVP requirements

Build in this order. R9.1 alone is a complete entry: a wizard that produces a personalised checklist.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R9.1 | **Five-question branching wizard → personalised requirements checklist** | Steps: (1) business type: retail, food, services, manufacturing, lodging; food asks "Will you prepare food on site?", lodging asks the number of rooms (1–200); (2) ownership: sole proprietorship, partnership, corporation, cooperative; (3) new business or renewal; (4) size: capital (total assets, ₱), floor area (m²), number of workers, and for a renewal also last year's gross sales (₱); (5) location: barangay (filterable list from `useLayer("barangays")`) and "Home-based?". One question per screen as a `<fieldset>` of large radio cards (`radio-group`) or labelled inputs; each step validated with its own zod schema (react-hook-form + `@hookform/resolvers`); "Step 3 of 5" progress; Back keeps the answers; steps slide with Motion `AnimatePresence` (a fade under reduced motion). `/result` shows `requirementsFor(answers)` grouped by office, each with its reason ("Because you prepare food on site"). Answers survive a reload. |
| R9.2 | **Estimated fee breakdown** | `estimateFees(answers)` with the rules in `src/content/fees.ts` (table below): one row per line with label, basis in words ("0.05% of ₱150,000 capital") and amount, plus a total. The bars (plain elements scaled with GSAP `scaleX`, no chart library) grow one after another and the total counts up (`CountUp`); under reduced motion everything is static. The screen and the printout say: **"Illustrative estimate, not an official assessment. The BPLO computes actual fees from the City Revenue Code."** Changing an answer recomputes the estimate. |
| R9.3 | **Hazard-aware siting check** | On `/result`: a map (`BaseMap`, `ZoneLayer` for one hazard at a time chosen with a `toggle-group`, default storm surge; `Legend`; `SelectedPoint`; `useFlyTo`) opens on the chosen barangay. Until a pin is dropped, the check runs at the barangay's interior point (`turf.pointOnFeature`), labelled "Barangay centre. Tap the map to pin your lot." A tap pins the lot → `lookupHazards` → `HazardStatusList` (three states, missing layers listed as missing) plus, for each `inZone` hazard, "What this means for your business" from `src/content/siting.ts`, e.g. "This lot is in a mapped storm-surge zone (High). Keep stock and electrical outlets above the expected water line; plan how you will close and protect stock when a storm-surge warning is raised." `notInZone` reads "Not in a mapped risk zone. Maps don't show every risk; keep a basic preparedness plan." A pin outside the city boundary reads "Outside data coverage. We can't say anything about this place." If the pin's barangay (`barangayAt`) differs from the answer, a button offers "Use {barangay}". In-zone results add **recommended** items to the checklist (badge "Recommended", never mixed with legal requirements). No zoning answer: there is no zoning layer, so the locational-clearance item says the CPDO confirms zoning. No siting text calls a lot "safe", in any language (wording test below). |
| R9.4 | **Steps and timeline** | `stepsFor(answers)` gives the ordered steps with office, where to go and working days; steps in the same group show as "You can do these on the same days"; the total reads "About {min}–{max} working days" (`timelineDays`). Vertical timeline UI with lucide icons per office. |
| R9.5 | **Printable checklist** | `/print` (also reached with a **Print** button on `/result`): checklist with empty checkboxes and reasons, the fee table with the illustrative label, steps and days, the siting summary in the three-state wording with the pin's coordinates (the map itself is not printed), the date generated and the disclaimer. `@media print` hides the app chrome; at most two A4 pages in Ctrl+P preview; real text, not images. |
| R9.6 | **Language toggle, `/sources`, disclaimer** | EN / Waray / Filipino via `useLang`, persisted; all UI text, requirement, step and siting content from `src/i18n/strings.ts` and `src/content/*.ts` (en + war + fil drafts). `/sources` uses `SourcesPage` (risk maps: CDRRMO/CPDCO, used with permission; boundaries: OCHA/HDX) plus a "Content in this app" card (as `children`): fee rules, requirements, steps and advice are illustrative and written for this prototype from general eBOSS knowledge; they are not Catbalogan's ordinance. Override `app.disclaimer` in `src/i18n/strings.ts` (`AppShell strings={strings}` passes it to the footer and `/sources`): "Prototype. Requirements, fees and timelines are illustrative estimates; confirm with the BPLO. Hazard maps show mapped risk zones only." |

## Domain functions (test-first in `src/domain/`)

- **Types.** `BizType = "retail" | "food" | "services" | "manufacturing" | "lodging"`. `Ownership = "sole" | "partnership" | "corporation" | "cooperative"`. `Answers { type; foodPrep?: boolean; rooms?: number; ownership; mode: "new" | "renewal"; capital: number; grossSales?: number; floorArea: number; workers: number; barangay: string; homeBased: boolean }`. `Requirement { id; office; labelKey; reasonKey; kind: "required" | "recommended" }`. `FeeLine { id; labelKey; basisKey; basisVars; amount: number }`. `Step { id; office; group: number; minDays: number; maxDays: number }`.
- `stepSchemas` (zod, one per step) and `isComplete(answers)`. Cases: negative or zero capital rejected; a renewal without gross sales rejected; food without `foodPrep` rejected; lodging without rooms rejected.
- `sizeClass(capital): "micro" | "small" | "medium" | "large"`: micro ≤ ₱3,000,000 · small ≤ ₱15,000,000 · medium ≤ ₱100,000,000 · large above (MSME asset bands). Cases at ₱3,000,000 (micro) and ₱3,000,001 (small).
- `requirementsFor(a): Requirement[]`. Cases:
  - sole + new → DTI business name registration; partnership or corporation + new → SEC registration and not DTI; cooperative + new → CDA registration
  - renewal → no name registration, no locational clearance; adds "previous year's permit" and "declaration of gross sales"
  - food + `foodPrep` → sanitary permit and a health certificate for every food handler; services and lodging → sanitary permit; manufacturing → environmental clearance (ENRO)
  - every answer → barangay business clearance, community tax certificate (individual for sole, corporate otherwise), fire safety inspection certificate (BFP); new → proof of location (lease contract or title / tax declaration)
  - no duplicates; stable order
- `estimateFees(a, rules = FEE_RULES): { lines: FeeLine[]; total: number }`. Each line is rounded to centavos; the total is the sum of the rounded lines. Rules (illustrative, in `src/content/fees.ts`):

  | Line | Applies when | Rule |
  |---|---|---|
  | Business tax | new | 0.05% of capital (one-twentieth of 1%) |
  | Business tax | renewal | last year's gross sales × rate by type (retail 1.0%, food 1.0%, services 0.75%, manufacturing 0.5%, lodging 0.75%), minimum ₱300 |
  | Mayor's permit fee | always | micro ₱500 · small ₱1,000 · medium ₱2,500 · large ₱5,000 |
  | Sanitary permit fee | food, services, lodging | ₱300, plus ₱20 per room for lodging |
  | Health certificates | food with on-site preparation | ₱150 × workers (at least 1) |
  | Garbage fee | always | home-based ₱150; otherwise floor area ≤ 25 m² ₱300 · ≤ 100 m² ₱600 · above ₱1,200 |
  | Locational (zoning) clearance fee | new | micro ₱500 · small ₱1,000 · medium ₱2,000 · large ₱4,000 |
  | Fire safety inspection fee | always | 15% of the sum of the lines above (modelled on the Fire Code's percentage structure) |
  | Barangay business clearance | always | micro ₱200 · otherwise ₱500 |
  | Community tax (cedula) | always | sole: ₱5 + ₱1 per full ₱1,000 of last year's gross sales (renewal only), max ₱5,000 · partnership, corporation, cooperative: ₱500 + ₱2 per full ₱5,000 of gross sales (renewal only), max ₱10,000 |

  Golden cases (all must be tests):
  1. New · sole · retail · capital ₱50,000 · 20 m² · 1 worker · not home-based → business tax 25.00 · mayor's permit 500 · garbage 300 · zoning 500 · fire inspection 198.75 · barangay 200 · cedula 5 → **total ₱1,728.75**.
  2. Renewal · corporation · food with on-site preparation · capital ₱1,500,000 · gross sales ₱2,000,000 · 60 m² · 4 workers → business tax 20,000 · mayor's permit 500 · sanitary 300 · health certificates 600 · garbage 600 · fire inspection 3,300 · barangay 200 · cedula 1,300 → **total ₱26,800.00**.
  3. New · sole · food with on-site preparation · capital ₱150,000 · 30 m² · 3 workers (the demo) → business tax 75 · mayor's permit 500 · sanitary 300 · health certificates 450 · garbage 600 · zoning 500 · fire inspection 363.75 · barangay 200 · cedula 5 → **total ₱2,993.75**.
  4. Renewal · sole · gross sales ₱10,000,000 → cedula capped at ₱5,000.
  5. Renewal · services · gross sales ₱20,000 → business tax ₱300 (the minimum).
  6. Home-based → garbage ₱150 whatever the floor area; lodging with 10 rooms → sanitary ₱500.
- `stepsFor(a): Step[]` from `src/content/steps.ts`:

  | Group | Step | Office | Working days | When |
  |---|---|---|---|---|
  | 1 | Register the business name | DTI (sole) / SEC (partnership, corporation) / CDA (cooperative) | 1–3 | new |
  | 2 | Barangay business clearance | Barangay hall | 1–1 | always |
  | 2 | Locational (zoning) clearance | City Planning and Development Office | 1–2 | new |
  | 2 | Sanitary permit and health certificates | City Health Office | 1–2 | food, services, lodging |
  | 2 | Environmental clearance | City Environment and Natural Resources Office | 2–5 | manufacturing |
  | 3 | File the unified application and get assessed | BPLO one-stop shop | 1–1 | always |
  | 4 | Pay the fees | City Treasurer | 0–1 | always |
  | 5 | Fire safety inspection | Bureau of Fire Protection | 1–3 | always |
  | 6 | Release of the Mayor's permit | BPLO | 1–1 | always |

- `timelineDays(steps): { min: number; max: number }`: the sum over groups of the group's largest `minDays` and largest `maxDays`. Cases: new · sole · retail → 5–11; renewal · services → 4–8; a group counts once however many steps it has.
- `sitingNotes(status: Partial<Record<Hazard, HazardStatus>>, missing: Hazard[]): { hazard; state: "inZone" | "notInZone" | "missing"; level?: Level; adviceKey?: string }[]` plus `outside: boolean` when every loaded hazard is `outsideCoverage`. Cases: storm surge `inZone` high → advice key; `notInZone` → no advice; all `outsideCoverage` → `outside: true` and no per-hazard advice; a missing layer → `state: "missing"`.
- `recommendedFromSiting(status): Requirement[]`: storm surge or flood in a zone at moderate or above → "Business continuity plan for typhoon closures" and "Keep stock and power points raised"; landslide in a zone → "Ask the Building Official about slope protection"; ground shaking or liquefaction at high or above → "Have the structure checked by an engineer". All `kind: "recommended"`. Cases for each, and none for `notInZone`.
- Wording test: no English string reachable from `siting.ts` or the siting keys in `strings.ts` contains "safe" (case-insensitive), and no Waray or Filipino one contains any of `FORBIDDEN_ANSWER_WORDS` from `@rcene/i18n`. ("Fire Safety Inspection Certificate" is the BFP document's official name, not a hazard answer: it lives in `requirements.ts` and `fees.ts`, outside the siting keys.)

## Data

- `useLayer("boundary")`, `useLayer("barangays")`, `useZones()` (all five hazards). Works on fixtures until the real data lands; the "Sample data" badge shows meanwhile.
- No synthetic records. Authored content in `src/content/`: `fees.ts` (`FEE_RULES` and the illustrative label), `requirements.ts`, `steps.ts`, `siting.ts` (per hazard: what it means for a business, and actions; en + war + fil drafts). Re-enter rules as config from general eBOSS knowledge; copy no code (PROPOSALS #9, "Edge").
- Store `createSyncedStore("09-negosyo:wizard", …, { version: 1 })` → `{ answers: Partial<Answers>; step: number; pin: LngLat | null }`, with actions `setAnswers`, `goTo(step)`, `setPin` and `restart`. One writer: the applicant's window. Requirements, fees, steps and siting results are derived, never stored.

## Experience

- Friendly and step-by-step: big choice cards with lucide icons, one question per screen, plain words ("capital" gets a one-line explanation).
- **Wow moment:** finishing step 5 lands on `/result`. The fee bars grow one after another and the total counts up to "₱2,993.75 (estimate)"; the map flies to the barangay; the applicant taps a point on the shore and the storm-surge chip "In a mapped risk zone — High" staggers in (built into `HazardStatusList`) with "What this means for your business", while a "Recommended: business continuity plan" item slides into the checklist (Motion `layout`). One element, one library: GSAP owns the fee bars and the total, Motion owns the wizard steps and checklist rows.
- **Accessibility:** each step is a `<fieldset>` with a `<legend>`; radio cards are real radio inputs; errors are linked with `aria-describedby` and announced; pesos formatted with `useFormat().currency`; the map is never the only way in (the barangay answer drives the default check point); the siting result is announced in an `aria-live="polite"` region; all touch targets ≥ 44 px; `prefers-reduced-motion` respected.

## Golden-path demo (≤ 2 minutes)

Setup: one window on port 5109 at 1280 px (the wizard is centred). Press **Reset demo** first.

1. `/`: Food → "prepare food on site: yes" → Sole proprietorship → New → capital ₱150,000, 30 m², 3 workers → a coastal barangay, not home-based.
2. `/result`: the checklist (DTI name registration, barangay clearance, locational clearance, sanitary permit, 3 health certificates, fire safety inspection, cedula, proof of location); the fee bars grow and the total counts up to ₱2,993.75; "About 5–11 working days".
3. Tap a point on the shoreline: storm surge **In a mapped risk zone — High** with what it means; "Business continuity plan" appears as Recommended.
4. Tap an upland point: the answers change; tap out at sea: **Outside data coverage**.
5. Switch to Waray: the checklist, fees and advice change language.
6. **Print** → Ctrl+P preview: two pages at most.
7. Open `/sources`.

## Definition of done

- [ ] R9.1–R9.6 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- Submitting an application, payments, BPLO integration, accounts.
- A zoning answer (there is no zoning layer), building-permit fees, real-estate or legal advice.
- Catbalogan's actual Revenue Code; any "risk score" for a lot.

## Stretch (only after the definition of done is met)

- S1 Share link `/result?a=<base64 answers>&at=lon,lat` that restores the answers and the pin.
- S2 Compare two lots side by side (two pins, two `HazardStatusList`s).
- S3 A **Book a BPLO appointment** button, hidden unless the host passes `onBook` (P6 wires it to #7 Pila's booking).

## Platform hooks

- Export `routes`.
- Export `Wizard`, `RequirementList`, `FeeBreakdown`, `StepsTimeline`, `SitingCheck` (takes `pin`, `onPin`, zones, boundary and barangays as props) and the domain functions with their types unchanged.
- P6 mounts the wizard and the siting check as its first two core modules and passes `onBook` to hand the applicant to #7 Pila's BPLO booking; #10 Reklamo's registry can later link a business to its siting result.
