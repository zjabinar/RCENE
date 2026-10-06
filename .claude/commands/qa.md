---
description: Run the QA gate - typecheck, tests, offline smoke test, then walk the golden path and the AI fallback; fix P0/P1 only.
argument-hint: '[optional: focus area or route]'
---

# /qa: the QA gate

Focus (may be empty): $ARGUMENTS

Use the `rscene-qa` agent to find problems; fix them in this session. Skill `demo-qa` has the full checklist.

1. `npm run typecheck`
2. `npm run test`
3. `npm run smoke`: builds, serves offline, opens every route in `project.json` `smokeRoutes` at 390 px and 1280 px in light and dark, checks console errors and axe, writes `docs/screenshots/`. Read every FAIL line. Look at the golden-path screenshots, the `-dark` ones too.
4. Walk the golden path from `DEMO.md` in `npm run dev` (http://localhost:5201) with the Playwright MCP, at 390 px and 1280 px. The template's path is:
   `/demo` (reset, load scenario) → `/console` (AI briefing) → `/admin/lab` (scripted text → AI triage → confirm) → `/console/:id` (move status, AI-drafted update, QR) → `/resident?code=…` → `/board` → `/poster`
5. AI fallback: on `/admin/ai` select a provider that is not configured (or go offline). Each AI card must still answer, show provider, model and latency, label "fallback", and say "AI suggestion — a person confirms". The activity log on `/admin/ai` records the attempt.
6. Hostile inputs: empty and very long text, Waray and Filipino text, an unknown code (`/console/REC-9999`), reload in the middle of the wizard, browser back, "Reset demo", a second window open on `/board`.
7. Report a table: severity (P0 demo blocked, P1 judge will notice, P2 cosmetic), route, steps, expected, actual.
8. Fix P0 and P1 only (unless I say otherwise). Re-run the failed check, then `npm run smoke` once more.
