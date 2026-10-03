> **Module brief** (reference). This is the spec of app #08 Sertipiko, copied from the monorepo's `docs/projects/08-sertipiko.md`. Its paths and ports are that app's. In P10 Barangay 360, `docs/brief.md` says which parts to lift or build, and wins where they differ.

# 08 · Sertipiko

| | |
|---|---|
| **App** | `apps/08-sertipiko` · dev port 5108 · preview 6108 · extras: `qrcode` (+ `@types/qrcode`) |
| **Batch** | 3 |
| **Proposal** | `docs/proposal.md` (#8 in the monorepo's `docs/PROPOSALS.md`) · the proposal asks for "a sharp new angle": here it is trust on both ends (fee up front, public verification) and no names stored |
| **Reused by platforms** | P5 Serbisyo Catbalogan (request → track → claim with QR verification), P10 Barangay 360 (open requests per barangay for the Punong Barangay) |
| **Data** | `barangays` · 🟢 HDX/OCHA boundaries · synthetic resident registry, requests and desk events (seed 801) · authored certificate types with illustrative fees |
| **AI in the app** | none |
| **Skills to use** | `gsap-motion` (timeline progress line, ink-stamp effect), Design plugin `ux-copy` (status, eligibility and verification wording) and `accessibility-review` (timeline, printed certificate) |

> Know the fee and the requirements before you leave home, watch your barangay certificate move from "Submitted" to "Ready to claim" live, and let anyone check in five seconds that a printed certificate is real.

## Problem

Residents can't see where a certificate request stands, and they learn and pay the fee at the hall on claim (PROPOSALS #8). LGU Portal Pro already tracks requests, so tracking alone is not new. Sertipiko's angle is **trust on both ends**:

1. **Up front:** every requirement, the posted fee (free for indigency), the processing time, the validity and who signs are shown *before* applying. The posted fee is the only fee.
2. **After printing:** every certificate carries a QR and a short code that anyone (an employer, a hospital social worker, a bank) can check at `/verify/:code`. A made-up or altered code fails, and a real code shows the registered details, so a doctored paper doesn't match.
3. **No names stored.** A resident is identified by a code from the barangay's Registry of Barangay Inhabitants (RBI). The barangay secretary writes the name on the certificate by hand after checking an ID at claim. The demo never handles personal data.

## Users and routes

| Role | Route | Device in the demo | Needs |
|---|---|---|---|
| Resident | `/` | phone-width window (design at 390 px) | Choose a certificate, see requirements, fee and time up front, request it; "track a request" box |
| Resident | `/r/:id` | same | Live status timeline; what to bring on claim |
| Resident / staff | `/r/:id/print` | laptop, print preview | The certificate on one A4 page with QR (only from "Ready to claim" on) |
| Anyone (employer, agency) | `/verify`, `/verify/:code` | phone | Is this certificate real and valid, and what does it say? |
| Barangay staff | `/staff` | laptop window | Request queue: verify, send for signature, mark ready, mark claimed, return, revoke |
| Anyone | `/sources` | — | Attribution, the synthetic-data note, disclaimer |

Use `AppShell width="phone"` for `/`, `/r/:id`, `/verify` and `/verify/:code`; `width="wide"` for `/staff` and `/sources`; `width="full"` for `/r/:id/print` (the print stylesheet hides the chrome). `showReset` everywhere; `layers={["barangays"]}`. Nav: Request (`/`), Verify (`/verify`), Staff (`/staff`), Data sources. Unknown ids show "No request with that code" with the track box. When running the smoke gate, also pass `--route /staff --route /verify --route /r/RQ-0001`.

## MVP requirements

Build in this order. R8.1 alone is a complete entry: request, staff queue and live tracking.

| ID | Requirement | Acceptance criteria (testable) |
|---|---|---|
| R8.1 | **Request and track**, synced live | `/` shows three cards: Barangay clearance, Certificate of indigency, Certificate of residency. Each opens a **Know before you go** panel from `src/content/certificates.ts`: requirements, fee (`feeFor`; "Free" for indigency), processing time, validity, who signs (title only), where to claim, and the line "The posted fee is the only fee." The form (react-hook-form + zod) asks for: barangay (filterable list of names from `useLayer("barangays")`), RBI resident code (`R-` + 4 digits, with a **Use a sample resident** button that fills the lowest-coded eligible seeded resident of that barangay for that type), and purpose (per-type list; clearance also allows "Other" with ≤ 80 characters). No name, birthdate, address or ID-number fields exist. Submit → a request id (`RQ-0041`, continuing after the seeded ones) and `/r/:id`: an ordered five-step timeline (Submitted → Verified → For signature → Ready to claim → Claimed) with a timestamp for each step reached. `/staff` lists requests with the `@rcene/ui/components/table` primitive (no table library is installed in this app), sorted by `sortQueue`, filterable by barangay, by tab (Active / Ready / Done / All) and by a search box (request id or RBI code); each row has exactly one primary action that advances one step. An advance made in `/staff` shows on `/r/:id` in another window within 1 s, without reload. A "Track a request" box on `/` opens `/r/:id`. |
| R8.2 | **Eligibility check** at the Verify step | **Verify** in `/staff` runs `checkEligibility` against the synthetic RBI and shows ✓ or every failing reason in plain language: not in this barangay's registry; registered in another barangay; less than 6 months' residence (residency); household not assessed as indigent, see the barangay social welfare desk (indigency); an open record at the barangay, see the secretary in person (clearance). Eligible → Verified. Not eligible → the action becomes **Return to resident** with the first reason preselected; the resident's timeline then ends at "Returned: {reason}" (a terminal state, shown in plain words, never just a color). |
| R8.3 | **Printable certificate with QR** | `/r/:id/print` (from Ready to claim on; earlier it explains "Available when your certificate is ready") renders an A4 portrait certificate: header "Republic of the Philippines · Province of Samar · City of Catbalogan · Barangay {name from the layer}"; the type's title; body text from `src/content/certificates.ts` with RBI code, purok, purpose, issue date and "Valid until {date}"; a blank line "Name (written by the barangay secretary after an ID check)"; a signature line titled "Punong Barangay" (no officials' names, no seals, no logos); the QR (`qrcode`, rendered locally) encoding `${location.origin}/verify/{code}`, with the code in large monospace type under it. A diagonal **SPECIMEN — prototype, not an official document** watermark shows on screen and in print. `@media print` hides the app chrome and fits one A4 page (check with Ctrl+P preview); the certificate is real text, not an image. A **Print** button calls `window.print()`. |
| R8.4 | **Public verification page** | `/verify` has one code input that accepts lowercase, spaces and missing dashes. `/verify/:code` answers exactly one of: **Valid** (type, barangay, purpose, issued on, valid until, RBI code, and "Check that the paper says the same"); **Expired** ("Expired on {date}"); **Revoked** ("Revoked on {date}"); **Not found** ("No certificate with this code was issued through Sertipiko"); **Not a real code** (malformed, or the check characters don't match: "mistyped or altered"). The seed includes one expired, one revoked and two valid historical certificates (codes recorded in `DEMO.md`). Staff can **Revoke** an issued certificate from `/staff` (with confirmation); the verify page then says Revoked. The page shows no personal data beyond the RBI code. |
| R8.5 | **Language toggle, `/sources`, disclaimer** | EN / Waray / Filipino via `useLang`, persisted; all UI text and the certificate body from `src/i18n/strings.ts` / `src/content/certificates.ts` (en + war + fil drafts). `/sources` uses `SourcesPage` (boundaries: OCHA/HDX) plus a "Synthetic data" entry (in `extra`, tier `synthetic`): "Residents, requests and certificates are generated by this app (seed 801). Fees are illustrative; each barangay sets its fees by ordinance." Override `app.disclaimer` in `src/i18n/strings.ts` (`AppShell strings={strings}` passes it to the footer and `/sources`): "Prototype. Residents, requests and fees are synthetic or illustrative; certificates printed here are not valid documents." |

## Domain functions (test-first in `src/domain/`)

Functions take `now` as an argument; build test times with `new Date(y, m, d, h, min)` (local), never `Z` strings.

- **Types.** `CertType = "clearance" | "indigency" | "residency"`. `Step = "submitted" | "verified" | "forSignature" | "ready" | "claimed"`. `Resident { code; barangay; purok: number; since: string /* "YYYY-MM" */; openRecord: boolean; indigencyAssessed: boolean }`. `Request { id; seq; type; barangay; residentCode; purpose; purposeOther?; createdAt }`. `DeskEvent { requestId; to: Step | "returned" | "revoked"; at; reason?: ReasonKey }`. `Certificate { code; requestId; type; barangay; residentCode; purok; purpose; issuedAt; validUntil; revokedAt? }`.
- `currentStatus(request, events): { step: Step; terminal: "returned" | "revoked" | null; history: { to; at; reason? }[] }` applies the request's events in time order. Cases:
  - only the next step in order is accepted; skips and repeats are ignored
  - `returned` is accepted only while the step is `submitted`, and nothing is accepted after it
  - `revoked` is accepted only at `ready` or `claimed`
  - events for other requests are ignored
- `checkEligibility(request, residents, now): { ok: true } | { ok: false; reasons: ReasonKey[] }`. Cases:
  - unknown code → `notInRegistry` (and no other reason)
  - resident of another barangay → `otherBarangay`
  - residency with `since` 5 months before `now` → `tooRecent`; exactly 6 months → ok (boundary)
  - indigency with `indigencyAssessed: false` → `notAssessed`
  - clearance with `openRecord: true` → `openRecord`
  - several failing rules return all their reasons, in that fixed order
- `feeFor(type, purpose): number` (rules in `src/content/certificates.ts`, illustrative): clearance ₱50, or ₱100 when the purpose is "business"; residency ₱30; indigency ₱0. One case each.
- `validUntil(type, issuedAt): number`: clearance and residency 6 months, indigency 3 months (illustrative), clamped to the month's last day. Case: issued 31 Aug 2026 → valid until 28 Feb 2027.
- `verificationCode(cert): string` → `BC-0041-7K`: prefix `BC` / `BI` / `BR` (clearance / indigency / residency), the request's 4-digit `seq`, and 2 check characters from FNV-1a (32-bit) over `prefix|seq|barangay|issued date (YYYY-MM-DD)|purpose`, drawn from the alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O/1/I/L). This is a tamper-evident checksum, not cryptography; say so in `NOTES.md` (production would sign codes on a server).
- `normalizeCode(input): string | null`: uppercases, strips spaces, restores dashes; null when the shape is wrong. Cases: `" bc 0041 7k "` → `"BC-0041-7K"`; `"BC-41-7K"` → null.
- `verifyCertificate(input, certs, now): { state: "valid" | "expired" | "revoked" | "notFound" | "invalid"; cert?: Certificate }`, in this order: malformed → `invalid`; no certificate with that prefix and seq → `notFound`; check characters ≠ the recomputed ones → `invalid`; `revokedAt` set → `revoked`; `now > validUntil` → `expired`; else `valid`. Cases: a round trip is valid; one changed digit that lands on another real certificate → `invalid` (so an altered digit never shows someone else's certificate); a seq never issued → `notFound`; expired; revoked beats expired; lowercase input works.
- `issuedCertificates(requests, events): Certificate[]`: one per request that reached `ready`; `issuedAt` = the time of its `ready` event; `revokedAt` from a `revoked` event.
- `sortQueue(rows, now)`: overdue first (more than 24 h in the current step), then oldest first; returned, revoked and claimed rows last. Cases for each rule.
- `openByBarangay(requests, events): Record<string, number>` (P10 hook): counts requests not claimed, returned or revoked. Case: a claimed request isn't counted.
- `seedResidents(rng, barangayNames)` and `seedRequests(rng, barangayNames, residents, dayStart)`: deterministic for seed 801 (names sorted first, so the order doesn't depend on the file).

## Data

- `useLayer("barangays")`: names for the picker, the certificate header and the seed. Fixture names say "Sample" until the real data lands, and the "Sample data" badge shows meanwhile.
- Synthetic (`src/domain/seed.ts`, `createRng(801)`), **computed at load in every window and never written to a store**:
  - 300 residents `R-0001…R-0300` spread over the barangays: `{ code, barangay, purok 1–7, since ("YYYY-MM" between 1990 and last month), openRecord (3 %), indigencyAssessed (25 %) }`. No names, birthdates or addresses beyond the purok. The generator guarantees every barangay at least one resident eligible for each certificate type, so **Use a sample resident** always has an answer (test it).
  - 36 recent requests `RQ-0001…RQ-0036` created over the last 5 days, at every step, with the desk events that put them there; at least 4 are overdue, 1 is returned, and 2 of the submitted ones fail verification (one `otherBarangay`, one `tooRecent`) for the demo.
  - 4 historical claimed requests `RQ-0037…RQ-0040` with certificates: one issued 7 months ago (expired), one revoked last month, two issued 1–2 months ago (valid).
  - Seed timestamps are anchored to the **start of today** (local) and all fall before it, so every window computes the same seed on the same day and no seeded event is in the future during a morning demo.
- Authored `src/content/certificates.ts`: per type, the requirements, purposes, fee rule, processing time (same day; indigency 1 working day), validity, signatory title and body template (en + war + fil drafts). Label the fees "Illustrative: each barangay sets its fees by ordinance."
- Stores, one writer per entity:
  - `createSyncedStore("08-sertipiko:requests", …, { version: 1 })` → `{ requests: Request[] }`. Written only by the resident side (`/`).
  - `createSyncedStore("08-sertipiko:desk", …, { version: 1 })` → `{ events: DeskEvent[] }`. Written only by `/staff`.
  - Status, certificates and the verification registry are derived (`currentStatus`, `issuedCertificates`) from seed ∪ stores. `/r/:id`, the print page and `/verify` only read.

## Experience

- The resident side is phone-first, warm and plain; the staff side is a dense table with one obvious action per row.
- **Wow moment:** staff click **Mark ready**, and in the resident's window the timeline's progress line draws on to "Ready to claim" (GSAP `scaleY`/`scaleX` with `transformOrigin`, never `height`/`width`), then a red ink stamp **READY TO CLAIM** lands on the card (scale 1.6 → 1, rotate −8°, a 2-frame shake, `autoAlpha`; started from the store change with the `contextSafe` pattern), with "Bring ₱50 and a valid ID" below. The same stamp marks `/verify/:code`: green **VALID**, or red **NOT A REAL CODE** with a horizontal shake.
- **Accessibility:** the timeline is an `<ol>` with `aria-current="step"`; status changes are announced politely; the stamp's words are also plain text; every table action is a real button reachable by keyboard; the print page is real text so screen readers can read it; `prefers-reduced-motion` makes the stamp appear without movement.

## Golden-path demo (≤ 2 minutes)

Setup: two windows on port 5108: A `/` at phone width, B `/staff`. Press **Reset demo** first.

1. A: Barangay clearance → Know before you go (₱50, a valid ID, same day, valid 6 months, signed by the Punong Barangay) → pick a barangay → **Use a sample resident** → purpose Employment → Submit → `RQ-0041`, timeline at Submitted.
2. B: type RQ-0041 in the search box → **Verify** (✓ eligible) → **For signature** → **Mark ready**. In A the line fills and the stamp lands: "Bring ₱50 and a valid ID".
3. A: **View certificate** → Ctrl+P preview: one A4 page with the QR and the SPECIMEN watermark.
4. Follow the QR link → `/verify/BC-0041-…`: VALID stamp and the registered details.
5. Change one character → NOT A REAL CODE. Enter the seeded expired code → "Expired on {date}".
6. B: **Verify** a seeded request from another barangay → the reason in plain words → **Return to resident**.
7. Open `/sources`.

## Definition of done

- [ ] R8.1–R8.5 meet their acceptance criteria
- [ ] Domain tests pass: `npm run test`
- [ ] `npm run typecheck` and `npm run build` pass
- [ ] `npm run smoke` passes (offline, no console errors, axe clean, screenshots at 390 and 1280)
- [ ] Every string comes from `src/i18n/strings.ts` (en + war + fil drafts); AI-drafted Waray/Filipino strings listed in `NOTES.md` under "Translations to review"
- [ ] `/sources` lists every dataset used; disclaimer footer on every view
- [ ] `STATUS.md`, `AI-LOG.md` (one row per commit) and `DEMO.md` are current

## Out of scope

- Online payment, uploading ID photos, accounts and logins, e-signatures or digital seals.
- Any real resident data, and any name field anywhere.
- Other certificate types (a business clearance belongs to #9), SMS notifications, cross-device sync.

## Stretch (only after the definition of done is met)

- S1 Bulk **Mark ready** (signed) for selected rows.
- S2 Resubmit a returned request with a corrected purpose (a new request linked to the old one).
- S3 Staff "Today" tiles (`StatTile countUp`): requests in, ready, claimed, fees collected (₱).
- S4 `/verify` reads the result aloud (`speechSynthesis`, feature-detected).

## Platform hooks

- Export `routes`.
- Keep `KnowBeforeYouGo`, `RequestForm`, `StatusTimeline`, `CertificateSheet`, `VerifyResult` and the domain functions free of app globals: the barangay list and the certificate config come in as props.
- P5 mounts request, track and verify after #20 Sumat's service finder (Sumat's `barangay-certificates` entry links here). P10 imports `openByBarangay` and `StatusTimeline` for its "open requests" panel.
