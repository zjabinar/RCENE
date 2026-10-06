# 02 — Four-Hour Runbook (October 7, 2026)

> Ported from the RSCENE_Vibecoding kit. In Andam the topic is already fixed (`docs/brief.md`), so the kit's `/plan`, `/reskin` and `/build-mvp` commands and `scenarios/` were not ported: read those steps as "follow `docs/brief.md` and `docs/plan.md`".

The topic is announced at T+0:00. The app already works: intake with AI triage, console, record pages, phone view, board, admin, `/demo`, `/presenter`, `/poster`. The job is to **point it at the topic**, make the AI do the topic's work, and demo it.

Times are T+h:mm from the official start. Write the real clock time of T+0:00 here when it starts: `______`

## Rule zero

Progress means a judge can understand the problem, operate the app, see AI change a decision, and see the impact. It does not mean lines of code.

## At a glance

| T+ | Phase | Done when | Commit |
|---|---|---|---|
| 0:00–0:20 | Interpret the topic, `/plan`, `/reskin` proposal | `docs/project/*.md` filled and approved | `baseline` |
| 0:20–0:50 | Re-skin | every screen reads as the topic | (optional) `reskin` |
| 0:50–1:45 | Core workflow | golden path works with the demo provider | `mvp-working` |
| 1:45–2:30 | AI wired to the topic | triage, briefing, draft answer live **and** in fallback | `ai-working` |
| 2:30–3:00 | Integration | `/demo`, presenter steps, poster draft, smoke passes | `integration-working` |
| **3:00** | **FEATURE FREEZE** | `/freeze` | |
| 3:00–3:20 | UX polish | top five fixes from `/review-ui` | |
| 3:20–3:35 | QA | no P0, no P1 on the golden path | |
| 3:35–3:50 | Poster and rehearsal | PDF exported, two timed run-throughs | |
| 3:50–4:00 | Final | `checklists/FINAL-10-MINUTES.md` | `competition-final` + tag |

Commit freely between milestones; the five milestone commits are the points you roll back to.

---

## Before T+0:00 (at the venue)

- [ ] `checklists/VENUE.md` done
- [ ] `git status` clean; `git describe --tags` shows `pre-event-freeze`
- [ ] `npm run dev`, open http://localhost:5400
- [ ] `/admin/ai` connection test passes with OpenAI on the venue Wi-Fi. If not: set the provider to `demo` and carry on; fix later
- [ ] Claude Code open in `C:\RSCENE_Vibecoding`; `docs/02-FOUR-HOUR-RUNBOOK.md` (this file) open beside it
- [ ] timer ready

## T+0:00–0:20 · Interpret, plan, map

| T+ | Do |
|---|---|
| 0:00–0:03 | Read the topic twice. Paste it verbatim into `docs/project/PROJECT-BRIEF.md` under "Topic". Ask the organisers: when and in what form is the poster due; any rule on pre-built code (see `docs/DISCLOSURE.md`). |
| 0:03–0:08 | Write six lines: problem, user, pain, solution, AI advantage, killer feature. Check `scenarios/` for the closest seed. |
| 0:08–0:14 | `/plan <topic>`. Read the four files it fills. Cut anything a judge cannot see in three minutes. Approve. |
| 0:14–0:18 | `/reskin`. Read the proposed `docs/project/RESKIN-MAP.md` and file list. Fix the terms. Approve. |
| 0:18–0:20 | `/checkpoint baseline` (plan docs only; the app is still the template). |

**Gate:** no approved plan by T+0:25 → take the closest scenario seed as it is and go.

## T+0:20–0:50 · Re-skin

| T+ | Do |
|---|---|
| 0:20–0:35 | Claude applies `/reskin` phase 2: strings (en/war/fil), categories, statuses, priorities, seed records, roles, `project.json` title, tagline and palette. You: answer its questions; write the scripted demo input (one paragraph, realistic, maybe Waray or Filipino). |
| 0:35–0:45 | The AI tasks' prompts **and** `demo()` rules move to the new categories. `npm run typecheck`, `npm run test`. |
| 0:45–0:50 | Click through `/`, `/console`, `/console/new`, `/console/REC-0001`, `/resident`, `/board` at 1280 px and 390 px. Commit (`reskin: <topic>`). |

**Gate:** every golden-path screen reads as the topic. If not, stop renaming secondary screens.

## T+0:50–1:45 · Core workflow (`/build-mvp`)

| T+ | Do |
|---|---|
| 0:50–1:05 | Intake on `/console/new`: the topic's fields in the wizard, validation, the record is created with a code. |
| 1:05–1:20 | Record page `/console/:id`: the topic's timeline steps, the status move, QR to `/resident?code=…`; the resident view and the board update. |
| 1:20–1:35 | The killer feature, smallest visible version. |
| 1:35–1:45 | Dashboard KPIs and chart for the topic. Walk the golden path once. `/checkpoint mvp-working`. |

**Gate:** the golden path works end to end with the demo provider. If the killer feature is not done, cut it to what shows in the demo, or defer it.

## T+1:45–2:30 · AI on the topic (skill `ai-feature`)

| T+ | Do |
|---|---|
| 1:45–2:00 | Triage on `/console/new`: topic categories and priority rules in the prompt and in `demo()`, the result in `AiInsightCard`, a person confirms, suggestion and final choice stored on the record. |
| 2:00–2:10 | Briefing on `/console`: the topic's KPIs, risks and recommended actions. |
| 2:10–2:20 | Draft on `/console/:id`: the topic's notice, reply or SMS. |
| 2:20–2:30 | Try each task live on `/admin/lab`; walk the golden path live; then pick a not-configured provider (or Wi-Fi off) and walk it again: every card answers and says "fallback". `/checkpoint ai-working`. |

**Gate:** every AI card answers live and in fallback, shows provider, model and latency, and says "AI suggestion — a person confirms".

## T+2:30–3:00 · Integration

| T+ | Do |
|---|---|
| 2:30–2:40 | `/demo`: reset loads the scenario; the scripted input and the record the demo opens are in `docs/project/DEMO-SCRIPT.md`. |
| 2:40–2:50 | Presenter steps match the demo script (`/demo` command). First draft of `/poster` from `docs/project/POSTER-CONTENT.md`. |
| 2:50–3:00 | `npm run smoke`; fix P0 only. `/checkpoint integration-working`. |

---

## FEATURE FREEZE · T+3:00

Run `/freeze`. From here on:

| Allowed | Not allowed |
|---|---|
| bug fixes | new screens or modules |
| UX and copy fixes, translations | new AI tasks or providers |
| loading, empty, error states | new dependencies or frameworks |
| responsive and dark-mode fixes | login, database, backend |
| demo data corrections | refactors |
| poster, presenter steps, rehearsal | "just one quick thing" |

## T+3:00–3:20 · UX polish

`/review-ui`, apply its top five safe fixes. Check Waray and Filipino on the golden path, dark mode, 390 px.

## T+3:20–3:35 · QA

`/qa`. Fix P0, then P1. `npm run smoke` again. One golden-path run with Wi-Fi off.

## T+3:35–3:50 · Poster and rehearsal

| T+ | Do |
|---|---|
| 3:35–3:42 | `/poster`: final text and screenshot; Print → Save as PDF, Margins None, Background graphics on; check it is one A3 page. Hand it over if the organisers asked for it. |
| 3:42–3:50 | Rehearse twice from `/demo` with `/?present` and `/presenter`, timer on (T). Cut to 3:00. |

## T+3:50–4:00 · Final

- [ ] `checklists/FINAL-10-MINUTES.md`
- [ ] `/checkpoint competition-final` (commit and `git tag competition-final`)
- [ ] stop editing; leave `npm run dev` running, `/demo` open, browser zoom set

---

## If you are behind

| When | Symptom | Do |
|---|---|---|
| T+0:50 | re-skin not finished | finish only the golden-path screens; leave the rest generic |
| T+1:45 | golden path broken | drop the killer feature; make intake → record → board work |
| T+2:30 | live AI not working | keep the demo provider, labelled; say so in the demo |
| T+3:00 | something is broken and the fix is unclear | restore that folder from the last milestone: `git restore --source <sha> -- src/<path>` |
| T+3:50 | anything | stop; present what works |

Never move the freeze. Cut scope instead (`rscene-scope-guardian`).

**Long context?** If Claude slows down or repeats itself: `/save-session quick`, then `/compact` (about two minutes). The handoff in `STATUS.md` comes back into the next session automatically.

## Keep the session healthy

- One main Claude Code session edits code; agents only review.
- Every 30 minutes, or when context gets long: `/checkpoint` (or at least update `STATUS.md`), then start a fresh session that reads `CLAUDE.md`, `STATUS.md` and `docs/project/*.md`.
