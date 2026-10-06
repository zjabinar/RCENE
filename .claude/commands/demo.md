---
description: Turn the working app into a 3-minute judge demo - script, click path, presenter steps for /presenter, and a backup plan.
---

# /demo: prepare the live demonstration

Use the `rscene-demo-coach` agent. Skill `presentation` has the details.

1. Read `docs/brief.md`, `DEMO.md`, `STATUS.md` and the `/demo` page.
2. Produce or update:
   - `DEMO.md`: 3 minutes as problem → user → input → AI → decision → action → impact; for each beat the route, the exact click or text, what the judge sees, and seconds
   - the presenter steps (the `PresenterStep[]` used by the `?present` bar and `/presenter`; find them with `grep -rn "PresenterStep" src`): one step per beat with `caption`, `route`, `notes`, `seconds`, all strings through `src/i18n/strings.ts`
   - the scripted input text (paste-ready, short) and the record code the demo opens
   - a one-sentence impact statement (label estimates as estimates)
   - the backup plan: AI provider set to `demo` on `/admin/ai`, the smoke screenshots in `docs/screenshots/`, what to say if a step fails
3. Rehearse: `/demo` to reset, open `/?present` on the projector window and `/presenter` in a second window, run it once with the timer (T), once with Wi-Fi off.
