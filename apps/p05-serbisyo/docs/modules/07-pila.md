> **Module brief** (reference). This is the spec of app #07 Pila, copied from the monorepo's `docs/projects/07-pila.md`. Its paths and ports are that app's. In P5 Serbisyo Catbalogan, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 07 · Pila

| | |
|---|---|
| **App** | `apps/07-pila` · dev port 5107 · preview 6107 · extras: `qrcode` (+ `@types/qrcode`) |
| **Batch** | 2 |
| **Proposal** | `docs/proposal.md` (#7 in the monorepo's `docs/PROPOSALS.md`) · documented need: "no digital queue or appointment system" |
| **Reused by platforms** | P5 Serbisyo Catbalogan (request → queue ticket, staff console with "Now Serving" board), P6 Negosyo Catbalogan (BPLO appointment booking) |
| **Data** | no map layers (`dataNeeds` is empty) · authored offices, services and counters (`src/content/offices.ts`) · synthetic queue history (seed 701) · tier: authored + synthetic |
| **AI in the app** | none |
| **Skills to use** | `gsap-motion` (split-flap flip, count-ups), Motion `layout` for the counter's queue list, Design plugin `ux-copy` (ticket and status wording) and `accessibility-review` (board legibility) |

> Take a ticket on your phone, watch your number flip onto the big "Now Serving" board, and see an honest wait estimate that shrinks as the counters work: three windows, one queue, no server.

## Problem

The LGU portal's own gap analysis records **no digital queue or appointment system**, and the walk-in queue screen that did exist was broken (PROPOSALS #7, "Documented needs"). Residents paying a tax or requesting a civil-registry copy stand in one line per office without knowing how long it will take, and can't step away without losing their place. Pila runs a whole office floor (ticket kiosk, counter consoles and a public board) on one laptop, offline, with every queue rule unit-tested.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Citizen | `/` | phone-width window (design at 390 px) | Pick an office and a service; take a walk-in ticket now, or book an appointment slot |
| Citizen | `/t/:code` | same window (opened after taking a ticket, or from the ticket's QR or link) | "Where am I in line, how long, which counter?", live |
| Public display | `/display` | projector or second screen (≥ 1280 px, fullscreen) | Now Serving per counter and who's next, readable from across a hall |
| Counter staff | `/counter/:id` (`c1`…`c6`) | laptop window | Call next, recall, skip, serve; see the queue for this counter's office |
| Anyone | `/sources` | — | What is authored and what is synthetic; disclaimer |

Use `AppShell width="phone"` for `/` and `/t/:code`, `width="full"` (no nav) for `/display`, and `width="wide"` for `/counter/:id` and `/sources`; `showReset` everywhere. Nav: Take a ticket (`/`), Counters (`/counter/c1`), Board (`/display`), Data sources. An unknown `:id` shows a counter picker with "Counter not found"; an unknown `:code` shows a code input with "No ticket with that code today". When running the smoke gate, also pass `--route /display --route /counter/c1 --route /t/T-001`.

## MVP requirements

Build in this order. R7.1 alone is a complete entry: a ticket and a counter console that stay in sync across windows.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R7.1 | **Walk-in ticket and counter console**, synced live across windows | `/`: office (4 large cards) → service (list with typical minutes) → optional checkbox "Priority lane: senior citizen, person with disability or pregnant (staff may ask for an ID)" → **Get ticket**. This issues the next code for that office (`nextCode`, e.g. `T-043`) and navigates to `/t/:code`, which shows the code in giant monospace digits, the service, the office, the status and "{n} ahead of you" (from `queueOrder`). `/counter/:id` shows the counter's office, an Open/Closed switch, the current called ticket (code, service, walk-in or appointment, priority, minutes waited) and the next 10 tickets in call order, with **Call next**, **Recall**, **Skip** (no-show) and **Serve** (mark the current ticket served). Keyboard: N, R, S, Enter, with visible key hints; Call next is disabled while a ticket is called; Recall, Skip and Serve are disabled when none is. A call made in a counter window shows "Go to Counter {n} now" on `/t/:code` in another window within 1 s, without reload. Only `/counter/:id` writes its own counter store and only `/` writes tickets (see Data). If two counters of one office call the same ticket, `deriveStates` keeps the earlier call and the other console shows "{code} was taken by Counter {n}. Call next again." |
| R7.2 | **"Now Serving" board** with a split-flap flip | `/display`: one tile per counter (counter number, office name, current code or "—"); closed counters are greyed out with the text "Closed"; under each office, "Next" lists its next 3 codes. A call or a recall flips that tile's characters split-flap style (GSAP, per-character stagger); a recall flips the same code again. A two-tone chime (Web Audio oscillator, no audio file) plays after the viewer has clicked **Turn on sound** once; until then nothing tries to play, so the autoplay policy logs no errors. An `aria-live="assertive"` region announces "Now serving {code} at Counter {n}". Code text ≥ 96 px and contrast ≥ 7:1 at 1280 px. A clock (HH:MM) in the corner. A **Full screen** button (Fullscreen API, hidden when unsupported). The initial load and store rehydration never flip or chime: only calls newer than the page load do. Reduced motion: the code swaps instantly with a 1-s highlight. |
| R7.3 | **QR ticket and wait estimate** | `/t/:code` shows a QR (rendered locally with `qrcode`) encoding `${location.origin}/t/{code}`, with the same URL as text underneath. The estimate comes from `estimateWait` (pure, tested): "About {lo}–{hi} min", "Under 5 min" when the upper bound is ≤ 5, "You're next" at 0 ahead, and "No counter is open for this office right now" when none is open. It never invents a number. It is recomputed every 15 s and on every store change; the "ahead" number counts down with `CountUp`. States: waiting (position + estimate), called (a full-width band "Go to Counter {n} now" with icon and pulse, plus `navigator.vibrate` where supported), served ("Served. Thank you!"), skipped ("You missed your call. Please see the office staff."). |
| R7.4 | **Appointment booking** | `/` → **Book an appointment**: service → day (today plus the next 4 working days, Mon–Fri; holidays out of scope) → a 30-min slot from `availableSlots`. Past, lunch (12:00–13:00), weekend and full slots are not offered; capacity is 2 × the office's counters per slot. Booking issues an appointment code (`TA-001` for the Treasurer, `CA-…`, `BA-…`, `AA-…`) and opens `/t/:code`: "Appointment {day}, {time}. Please arrive by {time − 10 min}." An appointment enters the call order 10 min before its slot, ahead of walk-ins (rule tested), and shows a calendar icon on the board and the console. If no slot is left today, the earliest free slot is suggested. |
| R7.5 | **Language toggle, `/sources`, disclaimer** | EN / Waray / Filipino via `useLang`. The language is shared across windows, so switching on `/` switches the board too (say so in `DEMO.md`). No hard-coded UI text (grep for JSX text literals). `/sources` uses `SourcesPage` plus a "Content in this app" card (as `children`): offices, services, counters and service times are illustrative and authored for this prototype; the morning's queue history is synthetic (seed 701). Override `app.disclaimer` in `src/i18n/strings.ts` (`AppShell strings={strings}` passes it to the footer and `/sources`): "Prototype queue. Offices, services and times are illustrative; wait times are estimates." The footer comes with `AppShell`. |

## Domain functions (test-first in `src/domain/`)

All functions take `now` (epoch ms) as an argument; nothing in `src/domain/` calls `Date.now()`. Build test times with the local-time constructor (`new Date(2026, 9, 9, 10, 30).getTime()`), never with `Z` ISO strings, so tests pass in any time zone.

- **Types** (`src/domain/types.ts`): `OfficeId = "treasurer" | "civilRegistry" | "bplo" | "assessor"` (the same ids as #20 Sumat, for P5). `Office { id; prefix: "T" | "C" | "B" | "A" }`. `Service { id; officeId; avgMinutes }`. `Counter { id: string; officeId; number: number; openByDefault: boolean }`. `Ticket { code; seq; officeId; serviceId; kind: "walkIn" | "appointment"; priority: boolean; issuedAt: number; slotStart?: number }`. `CounterEvent { type: "call" | "recall" | "skip" | "serve"; code: string; at: number }`. `TicketState = { status: "waiting" } | { status: "called"; counterId; calledAt; recalls } | { status: "done"; counterId; calledAt; doneAt } | { status: "skipped"; counterId; at }`.
- `nextCode(tickets: Ticket[], officeId, kind, now): { code: string; seq: number }`: walk-ins `T-001`… (3 digits, built with `code()` from `@rcene/data`), appointments `TA-001`…; one sequence per office and kind per day. Cases: the first ticket is `T-001`; after `T-009` comes `T-010`; offices are independent; walk-in and appointment sequences are independent; tickets from yesterday don't count.
- `ticketDay(t: Ticket): number`: the local day of `slotStart ?? issuedAt`. A ticket only belongs to its own day's queue.
- `deriveStates(tickets, logs: Record<string, CounterEvent[]>): { states: Map<string, TicketState>; conflicts: { counterId; code; at }[] }`. Each counter's log is **its seeded history followed by its stored events**, and is applied in that order; timestamps decide only cross-counter conflicts. Because each window anchors the seed at its own load time, ordering purely by timestamp would let windows disagree. Cases:
  - call → serve gives `done`; call → skip gives `skipped`; a recall increments `recalls`
  - a stored event timestamped earlier than one of the same counter's seeded events is still applied after it
  - an event for an unknown code is ignored
  - **two counters call the same code**: the earliest `at` wins (a tie goes to the lower counter id), and the other call is listed in `conflicts`
  - a second call while that counter already holds a called ticket is ignored
  - recall, skip or serve with no called ticket at that counter is ignored
- `queueOrder(tickets, states, officeId, now): Ticket[]` returns waiting tickets only: due appointments (`slotStart − 10 min ≤ now`) by `slotStart`, then priority walk-ins by `seq`, then regular walk-ins by `seq`. Appointments not yet due and other days' tickets are excluded. Walk-ins are ordered by `seq`, not by timestamp, so every window agrees even though each window computes the seed at its own load time (see Data). One case per rule, plus stable ties.
- `aheadOf(code, order): number | null`: the position minus 1, or null when the ticket isn't waiting.
- `avgServiceMinutes(tickets, states, officeId, fallback: number, window = 10): number`: the mean of `doneAt − calledAt` over the office's last `window` served tickets (seeded ones count as older than any stored one). Cases: fewer than 3 samples → `fallback`; only the last 10 count; skipped tickets are excluded.
- `estimateWait({ ahead, avgMinutes, openCounters }): { minutes: number; range: [number, number] } | null`, where `openCounters` is the number of the office's counters whose store says open (default from `openByDefault`). Null when `openCounters === 0`. `minutes = ceil(ahead × avgMinutes / openCounters)`; `range = [floor to 5 (minutes × 0.75), ceil to 5 (minutes × 1.25)]`; `ahead = 0` gives `{ minutes: 0, range: [0, 5] }`. Cases: (6 ahead, 5 min, 2 open) → 15 min, [10, 20]; 0 open → null; 0 ahead; 1 ahead at 3 min → [0, 5].
- `availableSlots(officeId, day: number, tickets, counters, now): { start: number; left: number }[]`: slots 08:00–11:30 and 13:00–16:30 every 30 min, capacity 2 × the office's counters. Cases: Saturday → []; slots before `now` are dropped; a full slot is dropped; nothing between 12:00 and 13:00.
- `seedDay(rng: Rng, anchor: number): { tickets: Ticket[]; logs: Record<string, CounterEvent[]> }`: deterministic for `createRng(701)` and a given anchor (see Data). Case: the same seed and anchor give deep-equal output; no seeded ticket is left `called`.

## Data

- No `@rcene/data` layers: `AppShell layers={[]}`, so no "Sample data" badge.
- Authored config `src/content/offices.ts`, generic, with no staff names:

  | Office | Prefix | Counters | Services (fallback minutes) |
  |---|---|---|---|
  | City Treasurer | T | c1, c2 | Community tax certificate (cedula) 3 · Real property tax payment 6 · Business tax payment 7 |
  | Civil Registry | C | c3, c4 (c4 closed by default, "on break") | Certified copy of a birth, marriage or death record 6 · Late registration of birth (assessment) 15 |
  | Business Permits and Licensing Office (BPLO) | B | c5 | New business permit 15 · Business permit renewal 10 |
  | City Assessor | A | c6 | Certified copy of a tax declaration 8 · Transfer of a tax declaration 15 |

- Synthetic history (`src/domain/seed.ts`, `seedDay(createRng(701), anchor)`): about 24 served tickets spread over the 2 hours before `anchor`, with service times of 2–12 min so the averages are realistic; 9 waiting walk-ins (2 priority) across the four offices; no seeded appointments. **The seed is computed at load in every window (anchor = page-load time rounded down to the minute) and never written to a store.** The stores hold only what people do after load, so there is no seeding race between windows, and "Reset demo" returns every window to the same seeded morning. User tickets continue each office's sequence after the seeded ones.
- Stores, one writer per entity:
  - `createSyncedStore("07-pila:tickets", …, { version: 1 })` → `{ tickets: Ticket[] }`, with actions `issue(serviceId, priority)` and `book(serviceId, slotStart)`. Written **only** by `/` (and its booking flow). Open one `/` window in the demo: two `/` windows issuing in the same second could overwrite each other (last write wins).
  - `createSyncedStore("07-pila:counter-c1", …)` … `"07-pila:counter-c6"`, one created at module load per configured counter → `{ open: boolean; events: CounterEvent[] }`, with actions `call`, `recall`, `skip`, `serve` and `setOpen`. Written **only** by `/counter/:id` for its own id. `/display` and `/t/:code` only read.
  - Everything else (the current ticket per counter, positions, estimates, "Next") is derived with `deriveStates` and `queueOrder` from seed ∪ stores. Sound on/off and full screen are local UI state, never persisted.

## Experience

- Three looks for three jobs: the kiosk/phone is big-button and calm; the board is dark, high-contrast and huge (a TV across a hall); the counter console is dense and keyboard-first.
- **Wow moment:** staff press N, and on the board that counter's code flips character by character like an airport split-flap board. Use the `gsap-motion` timeline pattern: for each character cell, the old top half folds down (`rotateX` 0 → −90°), then the new bottom half folds in (`rotateX` 90° → 0), with `transformPerspective` and a 0.06 s stagger between cells, fluttering through 3 intermediate characters before landing. The chime plays, and in the phone window "4 ahead of you" counts down to "3" while the estimate shrinks. One element, one library: GSAP owns the flap cells only; Motion `layout` may animate the counter console's queue rows.
- Ticket page: giant code, QR beneath, status as a wide colored band with icon + text (never color alone).
- **Accessibility:** `aria-live="polite"` on `/t/:code`, `assertive` on `/display`; every counter action is a real button with a shortcut and a visible hint; focus stays on the console after an action; all touch targets ≥ 44 px; `prefers-reduced-motion` turns the flip, pulse and count-down into instant updates.

## Golden-path demo (≤ 2 minutes)

Setup: three windows on port 5107: A `/display` (projector, full screen, click **Turn on sound**), B `/counter/c1` (City Treasurer, Counter 1), C `/` at phone width. Press **Reset demo** first.

1. C: City Treasurer → Community tax certificate (cedula) → **Get ticket**. The ticket page shows the new code, "{n} ahead of you · About {lo}–{hi} min" and the QR (record the real numbers for seed 701 in `DEMO.md`).
2. B: press N. A's Counter 1 tile flips to the next code with a chime; C counts down by one and the estimate shrinks.
3. B: Enter, N, Enter, N… until C's ticket is called. A flips to C's code; C turns into "Go to Counter 1 now".
4. B: press R. A re-flips and re-announces. Then press S on the next ticket to show a no-show.
5. C: **Book an appointment** at the BPLO for the next free slot → `BA-001`, "Please arrive by …".
6. Switch C to Waray. The board follows (shared language).
7. Open `/sources`: authored offices and services, synthetic history (seed 701).

## Definition of done

- [ ] R7.1–R7.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- Networking between devices. Sync is same-browser, multi-window only; a real phone scanning the QR would need the laptop's LAN address, which is not part of the demo.
- SMS or push notifications, accounts, ID checks for the priority lane, payments.
- Holidays, office-hours enforcement for walk-ins, multi-day analytics, ticket printers, any server.

## Stretch (only after the definition of done is met)

- S1 Printable 58-mm ticket (`@media print`) with the code and QR.
- S2 Spoken call ("Now serving T-043 at Counter 2") with `speechSynthesis`, feature-detected, only after **Turn on sound**.
- S3 Re-queue a skipped ticket from the counter's "Missed" list (a `requeue` counter event).
- S4 Counter "Today" tiles: served count and average service minutes (`StatTile countUp`).
- S5 The board's "Now serving" headline rotates through English, Waray and Filipino every 8 s, whatever the shared language.

## Platform hooks

- Export `routes`.
- Keep `TicketView`, `NowServingBoard`, `CounterConsole`, `BookingForm` and the domain functions free of app globals: they take the offices/services/counters config from a `QueueConfigProvider` (default: `src/content/offices.ts`), so P5 can feed services from Sumat's catalogue and P6 can mount BPLO booking alone.
- Export the tickets store's `issue(serviceId, priority)` and `book(serviceId, slotStart)` so a P5 "submit request → get ticket" flow calls them directly. Keep office ids identical to #20 Sumat's (`treasurer`, `civilRegistry`, `bplo`, `assessor`).
