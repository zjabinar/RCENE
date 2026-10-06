# P5 · Serbisyo Catbalogan

| | |
|---|---|
| **App** | `apps/p05-serbisyo` · dev port 5205 · preview 6205 |
| **Batch** | 5. Run it after batches 2 (#7 Pila, #20 Sumat) and 3 (#8 Sertipiko) are merged into `main` |
| **Proposal** | `docs/proposal.md` (P5 in the monorepo's `docs/PROPOSALS.md`) |
| **Modules** | `#20 Sumat` → Core 1: service finder with ★AI search (`docs/modules/20-sumat.md`)<br>`#8 Sertipiko` → Core 2: certificate request and tracking; its staff desk joins Core 3; QR verification is stretch S1 (`docs/modules/08-sertipiko.md`)<br>`#7 Pila` → Core 2: ticket, appointment and ticket page; Core 3: counter console and Now Serving board (`docs/modules/07-pila.md`) |
| **Roles** | Resident → `/resident` → phone<br>Frontline staff → `/staff` → wide<br>Now Serving display → `/display` → full |
| **Data** | `barangays` (🟢 OCHA/HDX) · synthetic: queue morning (seed 701), residents and certificate requests (seed 801) · authored: 26-service Citizen's Charter subset, offices, certificate config (all illustrative) |
| **AI in the app** | ★AI in-browser (skill `offline-ai`): #20's semantic re-ranking with `Xenova/multilingual-e5-small` (q8) in a Web Worker, started lazily. Fuse.js keyword search always answers first and is the fallback |
| **Skills to use** | `offline-ai`, `gsap-motion` (split-flap flip, ink stamp, count-ups), Motion `layout` (result re-rank, console rows), Design plugin `ux-copy` and `accessibility-review` |

> Say what you need in Waray, Filipino or English, take a ticket for the right office, watch your number flip onto the Now Serving board, then follow your barangay certificate to "Ready to claim": one resident, three windows, no server.

## Problem

A resident meets three gaps on one errand. The Citizen's Charter names services in official English ("Issuance of Community Tax Certificate") while residents ask for "a cedula" in Waray, and the LGU portal has no Waray or Filipino localisation, which is a government mandate (#20). There is no digital queue, and the old walk-in queue screen was broken (#7). A barangay certificate request can't be tracked, and the fee is learned at the hall (#8). Three separate apps would make the resident state the same need three times. In one platform the service found by search becomes the ticket's service and the counter's queue entry, and the resident, the staff and the board see the same record at the same moment.

## Roles, routes and windows

| Role | Route | Window in the demo | Needs |
|---|---|---|---|
| Resident | `/resident`, `/resident/s/:id`, `/resident/book/:id`, `/resident/cert/:type`, `/resident/t/:code`; `/resident/ai-check` (linked from `/sources`, not the nav) | A: phone, 420 × 860 (`width="phone"`) | Find a service in their own words; take a ticket, book a slot or request a certificate; follow it live |
| Frontline staff | `/staff` (picker), `/staff/counter/:id` (`c1`…`c6`), `/staff/desk` | B: 1200 × 860 (`width="wide"`) | Call, recall, skip and serve at one counter; verify and advance certificate requests |
| Now Serving display | `/display` | C: projector or second screen, fullscreen (`width="full"`; `AppLayout` hides the nav on `/display`) | Current code per counter and the next 3 per office, readable across a hall |

The generated scaffold already has: `/` (the role launcher: `RoleLauncher` cards with **Open** and **New window**), one placeholder page per role route, the nav, and `role.<id>.title` / `role.<id>.summary` strings in three languages (`src/roles.ts`, `src/pages/`, `src/i18n/strings.ts`). Replace each placeholder with the real view; keep the routes. Add to `smokeRoutes` in `project.json`: `/resident/s/cedula`, `/resident/cert/clearance`, `/resident/t/T-001`, `/resident/ai-check`, `/staff/counter/c1`, `/staff/desk`. Unknown ids and codes show the module's own empty state (#20 "We couldn't find that service", #7 "Counter not found"; `/resident/t/:code` "No ticket or request with that code today" with a code box). `showReset` on every route; `layers={["barangays"]}` (the certificate flow uses it). Keep the scaffold's nav and its width-by-role rule. Inside `/staff`, two tabs link Counters (`/staff`) and Certificate requests (`/staff/desk`).

## Lift, then wire

A platform is built from its module apps, not from scratch.

| Module app | Becomes | Lift (copy into `src/modules/<name>/`) | Change after lifting |
|---|---|---|---|
| `#20 Sumat` → `sumat/` | Core 1 | `src/domain/*` with tests, `src/content/{services,offices,fillers,queries}.ts`, `src/ai/*`, `ServiceSearch`, `ServiceCard`, `ServiceDetail`, `ReadAloudButton`, `useTextScale`, `useSemantic`, the `/ai-check` page | Routes under `/resident`; prefs store renamed `p05-serbisyo:prefs`; text size applied by the resident layout only (other roles stay at 100 %); `ServiceDetail` gets a `nextStep` slot; the worker starts on the first typed character, never on load or focus; `/ai-check` runs only on **Run check** |
| `#8 Sertipiko` → `sertipiko/` | Core 2 (request, track), Core 3 (desk) | `src/domain/*` with tests (incl. `seed.ts`), `src/content/certificates.ts`, `KnowBeforeYouGo`, `RequestForm`, `StatusTimeline`, the staff queue table; for S1 also `CertificateSheet`, `VerifyResult` | Stores `08-sertipiko:requests` and `:desk` become spine slices `requests` and `desk`; barangay list and certificate config come in as props |
| `#7 Pila` → `pila/` | Core 2 (ticket, booking, ticket page), Core 3 (console, board) | `src/domain/*` with tests (incl. `seed.ts`), `QueueConfigProvider`, `TicketView`, `BookingForm`, `CounterConsole`, `NowServingBoard` | Its services come from Sumat's catalogue via `queueServices`, passed to `seedDay` and the components as a config parameter (add it at lift if they read `offices.ts` directly); type `Service` imported as `QueueService`; stores `07-pila:tickets` and `:counter-cN` become spine slices `tickets` and `counters[cN]`; the office → service picker on #7's `/` is dropped (search replaces it); QR and links point to `/resident/t/{code}` |

**Which model wins** where two modules model the same thing:
- **Service catalogue: #20's `Service`** (26 ids, three-language content, fee, time) is the only catalogue. #7's `Service { id; officeId; avgMinutes }` is derived from it by `queueServices`; #7's fallback minutes move to `src/content/queue.ts`, keyed by Sumat ids.
- **Offices: #20's `offices.ts`** (names, where, hours) is the one table. #7's `prefix` and counters are added to the four queued offices: `treasurer` T (c1, c2), `civilRegistry` C (c3, c4 closed by default), `bplo` B (c5), `assessor` A (c6).
- **Certificate fees and times: #8's `feeFor` and `certificates.ts`** win over the single fee of #20's `barangay-certificates` entry; that service page shows #8's three certificate cards instead of one fee.
- **Ticket vs request: not merged.** A #7 `Ticket` is the record for every service of a queued office; a #8 `Request` is the record for barangay certificates. Codes stay the modules': `C-012`, `TA-001`, `RQ-0041`, `BC-0041-7K`. `parseTrackCode` tells them apart, and `/resident/t/:code` shows either.
- **Language:** one `useLang` for every window (as in #7): switching in A switches B and C.

1. **Check each module app** in this worktree: `../20-sumat/STATUS.md`, `../08-sertipiko/STATUS.md` and `../07-pila/STATUS.md` say `Phase: done`, and `npm run test` passes in each folder.
2. **Lift** by copying (`cp -r ../20-sumat/src/domain src/modules/sumat/domain`, and so on). Reading other app folders is fine; never edit them. Fix the imports, merge strings into `src/i18n/strings.ts` under `sumat.*`, `cert.*` and `pila.*`, and make the tests pass here. Models: `npm run fetch-models -- --model e5 --from ../20-sumat/models` if that folder has them, else `npm run fetch-models -- --model e5` (online). If neither works, build on Fuse alone and say so in `STATUS.md`.
3. **If a module app isn't done**, build only these requirements from `docs/modules/`: R20.1, R20.2, R20.3, R20.5; R8.1, R8.2; R7.1, R7.2, R7.3, R7.4. Domain first, test-first, exactly as that brief specifies, so a later lift can replace it.
4. **Record every lift** in `NOTES.md` under "Lifted modules": app, its commit (`git log -1 --format=%h -- ../NN-slug`), files and what you changed.

## Spine (one store, keyed by barangay)

`createSyncedStore("p05-serbisyo:spine", …, { version: 1 })`, one slice per writer. A queue belongs to an office, not a barangay, so P5's records are keyed by code; certificate requests carry `barangay` (the name from the layer), so #8's `openByBarangay` still serves P10.

| Slice | Shape | From | Only writer |
|---|---|---|---|
| `tickets` | `Ticket[]` | #7 | `/resident` (`issue(serviceId, priority)`, `book(serviceId, slotStart)`) |
| `counters` | `Record<"c1"…"c6", { open: boolean; events: CounterEvent[] }>` | #7 | `/staff/counter/:id`, its own id only (`call`, `recall`, `skip`, `serve`, `setOpen`) |
| `requests` | `Request[]` | #8 | `/resident/cert/:type` (`submitRequest`) |
| `desk` | `DeskEvent[]` | #8 | `/staff/desk` (`advance(requestId, to, reason?)`, `revoke`) |

- Seeds are **computed at load in every window and never stored**: #7 `seedDay(createRng(701), anchor)` (anchor = page-load time rounded down to the minute), #8 `seedResidents`/`seedRequests` with `createRng(801)` anchored to the start of today. Ticket states, positions, estimates, request status and certificates are derived from seed ∪ spine (`deriveStates`, `queueOrder`, `estimateWait`, `currentStatus`, `issuedCertificates`).
- The whole object is last-write-wins. Write only on a user action (never on load, on a timer or on rehydrate), and open one window per role in the demo.
- `p05-serbisyo:prefs`: #20's `{ textScale; rate; checked; recent }`, read only by resident views. Sound and full screen stay local UI state.

## MVP requirements

Build in this order. **R1 alone must be a finished, demoable single-feature app** (the platform degrades into #20 Sumat).

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R1 | **Service finder** (#20 R20.1, R20.2, R20.3, R20.5) | `/resident` and `/resident/s/:id` meet R20.1, R20.2, R20.3 and R20.5 of `docs/modules/20-sumat.md`; its tests pass here, including "keyword half in Fuse top 3 for ≥ 90 % of queries". A query in Waray finds services while the UI is in English. Loading `/resident` requests nothing under `/models/`; with `/models/` absent the page shows "Smart search off" and logs no console error. Each service page ends with a **Next step** panel from `nextStepFor` (until R2: office, where to find it, hours). Every fee carries "Illustrative: check the office's posted Citizen's Charter." |
| R2 | **Request → ticket → track** (#7 R7.1 ticket side, R7.3, R7.4; #8 R8.1 resident side) | Next step `ticket`: **Get a ticket** (with #7's priority-lane checkbox) issues the office's next code and opens `/resident/t/:code` per R7.3: giant code, Sumat's service title in the UI language, "{n} ahead of you", `estimateWait` wording, QR encoding `${location.origin}/resident/t/{code}`; **Book a slot** opens `/resident/book/:id` per R7.4 (`CA-001`…). Next step `certificate`: three cards → `/resident/cert/:type` with `KnowBeforeYouGo` and `RequestForm` per R8.1 (no name field; **Use a sample resident**) → `RQ-0041` → `/resident/t/RQ-0041` with `StatusTimeline`. Next step `visit`: office, where, hours and "No queue for this office in this prototype". **My requests** on `/resident` lists `trackItems` with a status chip (icon + text) linking to each code; empty: "Nothing yet today". |
| R3 | **Staff console and Now Serving display** (#7 R7.1 console, R7.2; #8 R8.1 desk, R8.2) | `/staff`: six counter cards (number, office, Open/Closed, current code) and a **Certificate requests** card with the open count. `/staff/counter/:id` = `CounterConsole` per R7.1: Open/Closed, the called ticket with Sumat's service title, the next 10, **Call next** (N), **Recall** (R), **Skip** (S), **Serve** (Enter) with visible key hints, and the two-counter conflict message. `/display` = `NowServingBoard` per R7.2: codes ≥ 96 px at ≥ 7:1 contrast, a flip only for calls newer than page load, the chime only after **Turn on sound**, `aria-live="assertive"`, clock, **Full screen**. `/staff/desk` = #8's queue per R8.1 and R8.2: `sortQueue`, tabs Active / Ready / Done / All, search by RQ or RBI code, one primary action per row, **Verify** runs `checkEligibility`, **Return to resident** with a reason. |
| R4 | **The cross-role workflow** | (a) **Get a ticket** in A adds the code to B's next-10 list and to its office's "Next" on C. (b) **Call next** in B that reaches A's code flips C's tile and turns A into "Go to Counter {n} now". (c) **Mark ready** in `/staff/desk` moves A's timeline to "Ready to claim" with the stamp. Each change shows in the other windows in < 1 s without reload; a reload of any window restores it; **Reset demo** returns all three windows to the seeded morning. |
| R5 | **Languages, `/sources`, disclaimer** | EN / Waray / Filipino via `useLang`, shared by all windows; platform strings under `platform.*`; service content keeps its `lang` attribute. `/sources`: `SourcesPage` (barangays: OCHA/HDX) with `extra` entries (tier `synthetic`): "Queue morning: seed 701, codes only"; "Residents, certificate requests and certificates: seed 801, RBI codes, no names". A "Content in this app" card: services, offices, fees, times and certificate fees are an illustrative subset modelled on the structure of a Citizen's Charter (a public document), not copied from Catbalogan's. An "AI model" card: `Xenova/multilingual-e5-small` (MIT), runs on this device, nothing is sent. `app.disclaimer` in three languages: "Prototype. Services, fees, times and queues are illustrative or synthetic; check the office's posted Citizen's Charter." |

## Domain functions (test-first in `src/domain/`)

Lifted functions keep their tests in `src/modules/<name>/`. Platform functions take `now` or `dayStart` as arguments; build test times with `new Date(y, m, d, h, min)`.

- `queueServices(catalogue: Service[], minutes = QUEUE_MINUTES, defaults = OFFICE_DEFAULT_MINUTES): QueueService[]`: one entry per catalogue service whose office is `treasurer`, `civilRegistry`, `bplo` or `assessor`; `avgMinutes` from #7's table (`cedula` 3, `rpt-payment` 6, `business-tax-payment` 7, `civil-record-copy` 6, `late-birth-registration` 15, `business-permit-new` 15, `business-permit-renewal` 10, `tax-declaration-copy` 8, `tax-declaration-transfer` 15), else the office default (treasurer 5, civilRegistry 10, bplo 12, assessor 10). Cases: 14 entries for Sumat's catalogue; `birth-registration` gets 10; `officeId` equals the catalogue's `office`; a `QUEUE_MINUTES` key missing from the catalogue throws `Unknown service: {id}`.
- `nextStepFor(serviceId, catalogue, queue: QueueService[]): { kind: "ticket"; officeId; serviceId } | { kind: "certificate" } | { kind: "visit"; officeId } | null`. Cases: `cedula` → ticket at `treasurer`; `birth-registration` → ticket at `civilRegistry`; `barangay-certificates` → certificate; `senior-id` → visit; an unknown id → null.
- `parseTrackCode(input): { kind: "ticket"; code } | { kind: "request"; id } | { kind: "certificate"; code } | null`: uppercase, strip spaces, restore the dash. Tickets `^(T|C|B|A)A?-\d{3,}$`, requests `^RQ-\d{4,}$`, certificates via #8's `normalizeCode`. Cases: `" t 043"` → ticket `T-043`; `"ca001"` → ticket `CA-001`; `"rq0041"` → request `RQ-0041`; `"bc 0041 7k"` → certificate `BC-0041-7K`; `"RQ-41"` → null; `"hello"` → null.
- `trackItems({ tickets, requests, ticketStates: Map<string, TicketState>, requestStatus: (r: Request) => ReturnType<typeof currentStatus>, counters: Counter[], dayStart }): TrackItem[]`, called with spine items only (the seed never counts as "mine"). `TrackItem { code; kind: "walkIn" | "appointment" | "certificate"; serviceId; at; status: TicketState["status"] | Step | "returned" | "revoked"; counterNumber?: number }`; a certificate's `serviceId` is `barangay-certificates`. Cases: items before `dayStart` excluded; newest first, ties by code; a called ticket carries its counter number; a returned request reads `returned`; an appointment has kind `appointment`.
- Content tests: every `QUEUE_MINUTES` key and `barangay-certificates` exist in the catalogue; the four queued office ids equal #7's `OfficeId` union; every certificate type in `certificates.ts` has en, war and fil.

## Data

- `useLayer("barangays")`: the certificate form's barangay picker and the seed. Fixtures until the data session lands ("Sample data" badge meanwhile). No hazard layers: P5 gives no hazard answers.
- Synthetic: seeds 701 and 801 as above, never written to a store. Codes only (`T-043`, `RQ-0041`, `R-0123`), never personal names, and no name, birthdate or ID-number field anywhere.
- Authored: `src/modules/sumat/content/*` (the catalogue), `src/content/queue.ts` (minutes), `src/modules/sertipiko/content/certificates.ts`.
- Store keys: `p05-serbisyo:spine` and `p05-serbisyo:prefs`. Static content and layers are never persisted.

## Experience

- **Signature:** three windows side by side. One service travels from a sentence in the resident's own language, to a counter's queue, to a flipping code on the board, then to a stamped timeline. No single module app shows the handoff. Recipes: #20's re-rank with Motion `layout` (`offline-ai`), #7's split-flap timeline and #8's ink stamp (`gsap-motion`).
- **Wow moment:** "my baby was born last week" re-ranks to "Register a newborn's birth" with "Re-ranked on this device by AI"; **Get a ticket**; staff press N and the board flips that code with a chime while the phone says "Go to Counter 3 now".
- **Accessibility:** search label and result count in `aria-live="polite"`; ticket status changes polite on A, assertive on C; every console action is a real button with a key hint, and focus stays on the console; desk rows reachable by Tab; text size 150 % at 390 px with no horizontal scroll; touch targets ≥ 44 px; every status is color + icon + text; `prefers-reduced-motion` makes the re-rank, the flip (instant swap with a 1-s highlight), the count-down and the stamp instant.

## Golden-path demo (≤ 3 minutes)

Windows on port 5205, opened from `/` with **New window**: A `/resident` (420 × 860, left of the laptop screen); B `/staff/counter/c3` (1200 × 860, right of A); C `/display` fullscreen on the projector (else a 1280 × 720 window over B). Press **Reset demo**, then **Turn on sound** in C. Record the real codes and counts for seeds 701 and 801 in `DEMO.md`.

1. A: type "my baby was born last week". Fuse shows a weak match, then "Register a newborn's birth" rises with the AI badge. Open it: steps, requirements, Civil Registry, illustrative fee and time. (30 s)
2. A: **Get a ticket** → `C-0nn`, "{n} ahead of you · About {lo}–{hi} min", the QR. Within 1 s the code is in B's next-10 list and under Civil Registry "Next" on C. (15 s)
3. B: N, Enter, N… Each call flips Counter 3 on C with a chime, and A counts down. When A's code is called, A shows "Go to Counter 3 now". B: Enter → A: "Served. Thank you!" (40 s)
4. A: switch to Waray (B and C follow). Type "barangay clearance" → the barangay certificates card → Barangay clearance → Know before you go (₱50, illustrative) → a barangay → **Use a sample resident** → Employment → Submit → `RQ-0041` at Submitted. (40 s)
5. B: **Certificate requests** → RQ-0041 → **Verify** (eligible) → **For signature** → **Mark ready**. A: the line fills and READY TO CLAIM lands: "Bring ₱50 and a valid ID". (25 s)
6. If S1 is built: A: **View certificate** → follow the QR link → VALID; change one character → NOT A REAL CODE. (20 s)
7. Open `/sources`. (10 s)

## Definition of done

- [ ] R1–R5 meet their acceptance criteria
- [ ] Domain and lifted-module tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes for `/`, every role route, the added routes and `/sources` (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] With `models/` empty, search works on Fuse alone with no console errors
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset and the model; disclaimer footer on every view
- [ ] `NOTES.md` "Lifted modules" lists every lift; `STATUS.md`, `AI-LOG.md` and `DEMO.md` are current

## If time runs out

Cut in this order: stretch; booking (`/resident/book/:id`, keep walk-in tickets); the certificate branch (`/resident/cert/:type`, `/staff/desk`), leaving Sumat + Pila; then R3 and R4. With only R1 left, hide the staff and display cards on `/`, drop their routes from `smokeRoutes`, and demo **#20 Sumat**.

## Out of scope

- Payments, accounts and logins, SMS or push, ID checks for the priority lane, any server or remote API, runtime translation, speech input.
- Queues for offices other than the four above; holidays; real Citizen's Charter text; real residents or any name field.
- Cross-device sync: same-browser windows only (a real phone scanning the QR would need the laptop's LAN address).

## Stretch (only after the definition of done is met)

- **S1 Claim with QR verification** (#8 R8.3, R8.4): `/resident/t/:code/print` (from Ready to claim on) with the SPECIMEN watermark and a QR to `${location.origin}/resident/verify/{code}`; `/resident/verify` and `/resident/verify/:code` with the five answers; **Revoke** on `/staff/desk`. `parseTrackCode` sends a `certificate` result to the verify page.
- **S2 Read aloud** (#20 R20.4) on `/resident/s/:id`, if it did not come with the lift.
- **S3 Spoken call** on the board (#7 S2), only after **Turn on sound**.
- **S4 Staff "Today" tiles** on `/staff` (`StatTile countUp`): tickets served per office, average service minutes, certificate requests in, ready and claimed.
