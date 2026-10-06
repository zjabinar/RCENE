---
name: presentation
description: The live 3-minute demo and pitch for the judges - the demo script, PresenterMode steps (the ?present bar) and the /presenter speaker-notes window from @rcene/kit/poster, the /demo reset, rehearsal and the backup plan. Use when writing or timing the demo script, editing presenter steps, rehearsing, preparing for judge questions, or when the live AI or the app might fail on stage.
---

# Presentation and live demo

## The story (3 minutes)

| Beat | Seconds | Shows |
|---|---|---|
| Problem | 20–30 | one sentence of local pain; the user |
| Input | 20–30 | the intake on `/admin/lab` with the scripted text (pasted, not typed) |
| AI | 45 | the triage result: category, priority, summary, actions, provider and latency |
| Decision and action | 45 | the person confirms; record detail `/console/:id`, status moves, AI-drafted update, QR |
| Reach | 20 | `/resident?code=…` on the phone view and `/board` update at once |
| Impact | 20–30 | one number or before/after, labelled honestly; close with the pitch |

Write it in `DEMO.md` (`/demo` command, agent `rscene-demo-coach`).

## The tools in this app

- **`/demo`**: resets the data and loads the scenario. Start every rehearsal and the real demo here.
- **Presenter bar**: open the app with `/?present`. `PresenterMode` shows "Step n of N", the caption and a timer, and navigates to each step's route.
- **`/presenter`**: `PresenterNotes` in a second window on the laptop screen: notes, timer, "Up next". Both windows stay in step.
- **Steps**: a `PresenterStep[]` (`{ id, caption, route, notes, seconds }`), one per beat, strings through `src/i18n/strings.ts`. Find them with `grep -rn "PresenterStep" src`. Keep them identical to the demo script.
- **Keys**: → / Space / PageDown next, ← / PageUp back, **T** timer, **Esc** hides the bar (a judge can use the app), **P** brings it back. A clicker works.

## Rehearse

1. `/demo` → `/?present` on the projector window, `/presenter` on the laptop.
2. Run it with the timer; cut until it fits 3:00 with 20 s spare.
3. Run it once with Wi-Fi off: the AI cards answer from the demo provider and say "fallback".
4. Run it once in dark mode and once at 390 px if a phone view is shown.

## Backup plan

| Failure | Do |
|---|---|
| live AI slow or down | `/admin/ai` → provider `demo`; say "this is the offline fallback, same schema" |
| projector resolution | browser zoom 125–150%; the layout is responsive |
| app will not start | `npm run preview` of the last good build; else `docs/screenshots/` |
| a step breaks | skip with →, keep the story going; never debug on stage |

## Judge questions to prepare

What does AI decide, and who confirms? What if the internet is down? Where are the keys? What data is real? What was built before today (`docs/DISCLOSURE.md`)? How would the city adopt it?
