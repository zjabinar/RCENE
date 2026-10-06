---
name: demo-qa
description: The pre-demo QA checklist for this app - typecheck, tests, npm run smoke (offline, 390/1280, light/dark, axe), the golden path from /demo to /poster, the AI fallback labels, hostile inputs, P0/P1/P2 triage. Use before a milestone commit, after FEATURE FREEZE, in the last 30 minutes, or whenever something "looks broken" before the judges see it. The /qa command runs it.
---

# Demo QA

Test the path the judges will see, in the order they will see it. Fix what blocks the demo first.

## Severity

| Level | Meaning | When to fix |
|---|---|---|
| P0 | demo blocked: crash, dead route, AI step never answers, data gone | now |
| P1 | a judge will notice: wrong label, missing state, clipped text at 390 px, raw i18n key, console error | before the next checkpoint |
| P2 | cosmetic | only if time is left after freeze work |

## 1. Automated gate

```bash
npm run typecheck
npm run test
npm run smoke
```

`npm run smoke` builds, serves the build **offline**, opens every route in `project.json` `smokeRoutes` at 390 px and 1280 px in light and dark, fails on console errors and serious axe violations, and writes `docs/screenshots/`. Offline means live AI fails, so it also proves the demo fallback renders. Look at the screenshots of the golden path, `-dark` ones too.

## 2. Golden path (`npm run dev`, http://localhost:5201)

Follow `DEMO.md`. The template's path:

1. `/demo`: reset; the scenario loads
2. `/console`: KPIs, chart, table, AI briefing card
3. `/admin/lab`: paste the scripted text → AI triage → edit or accept → finish → toast, new code
4. `/console/:id`: timeline, move status, AI-drafted update, QR
5. `/resident?code=…`: phone view shows the new status
6. `/board`: updates in a second window
7. `/poster`: one A3 page, no overflow notice

## 3. AI fallback

- `/admin/ai`: connection test passes with the live provider; activity log shows provider, model, latency.
- Pick a provider marked not configured, or turn Wi-Fi off: every AI card still answers, says "fallback", and keeps "AI suggestion — a person confirms".
- Nothing spins forever (timeout `AI_TIMEOUT_MS`).

## 4. Hostile checks

Empty and very long input · Waray and Filipino input · `/console/REC-9999` · reload mid-wizard · browser back · "Reset demo" · two windows open · dark mode · 390 px · keyboard only through the wizard · no "Lorem", "Test User", personal names, or "safe" as a hazard answer.

## Report

| Severity | Route | Steps | Expected | Actual | File |
|---|---|---|---|---|---|

Fix P0, then P1. Re-run the failed check and `npm run smoke`.
