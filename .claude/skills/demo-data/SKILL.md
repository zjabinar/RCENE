---
name: demo-data
description: Seeded, coded, realistic demo data for this app - createRng(seed) and code() from @rcene/data, record codes like REC-0001 and BRGY-01, the pinned demo day, never personal names. Use when re-skinning the seed records to a new topic, adding sample records, writing the scripted demo input, fixing data that looks fake (Lorem, Test User), or when the demo must repeat exactly after "Reset demo".
---

# Demo data

Judges trust a demo that looks real and repeats exactly. All sample data is generated from a seed, uses codes, and contains no personal data.

## Where it lives

| What | Where |
|---|---|
| Seeded random generator | `createRng(seed)` from `@rcene/data` (`next`, `int`, `float`, `pick`, `weighted`, `bool`, `shuffle`) |
| Codes | `code("REC", 1)` → `REC-0001`; barangays `BRGY-01`…; use the topic's prefix if it reads better (`INC-`, `APP-`, `RPT-`) |
| The records and their seed | `src/domain/records.ts` (`seedRecords`, categories, priorities, statuses, target days) |
| The demo clock | `src/domain/time.ts` (`DEMO_DAY` pinned to 2026-10-07, so "overdue" and "this week" read the same at every rehearsal) |
| Store | `src/store.ts` (synced across windows) |
| Reset | "Reset demo" in the header, `/admin/data` (reset and export), and `/demo` |
| Map layers | `data/` via `useLayer` from `@rcene/data`; fixtures say "Sample" |

## Rules

1. **Never personal names**, phone numbers, addresses of real people or real IDs. Use codes and roles ("Resident", "Desk officer").
2. **Seed everything.** No `Math.random()`, no `Date.now()` in seed code. Note the chosen seed and why in `NOTES.md`.
3. **Small and complete:** 20–40 records, every category and status present, a few overdue, one or two urgent. Dates fall in the two weeks before `DEMO_DAY`.
4. **`REC-0001` must exist** (it is a smoke route in `project.json`); keep it open and interesting.
5. **One record per demo beat:** the record the demo opens, plus the scripted input text that the AI triage turns into a new one. Write them into `DEMO.md`.
6. **Local and plausible:** Catbalogan barangays (from the barangays layer for new records, `BRGY-` codes in the seed), local services and offices, ₱ amounts through `useFormat().currency`.
7. **AI test inputs:** for each category, one English, one Waray and one Filipino sentence, so `demo()` rules and the live prompt can both be checked on `/admin/lab`.
8. **No Lorem, no "Test", no "asdf".** Every label goes through `src/i18n/strings.ts`.
9. Synthetic data is credited on `/sources` as synthetic; show `SampleDataBadge` where it matters.

## After changing the seed

`npm run test` (domain tests pin counts and codes; update them deliberately), then `npm run smoke`, then "Reset demo" in the browser and walk the demo once.
