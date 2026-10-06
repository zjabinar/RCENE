# 05 — Demo and Presentation

Deliverables: the working app, the A3 poster, a live demo. Skills: `presentation`, `poster`. Command: `/demo`.

## The formula

```text
PROBLEM → USER → INPUT → AI → DECISION → ACTION → IMPACT
```

## Three minutes on the template

| Time | Beat | Route | Show |
|---|---|---|---|
| 0:00–0:25 | Problem | `/` | one sentence of local pain; who suffers it |
| 0:25–0:50 | User and input | `/admin/lab` | the officer's intake; paste the scripted text |
| 0:50–1:35 | AI | `/admin/lab` | triage: category, priority, summary, actions; provider and latency; "a person confirms"; accept or edit |
| 1:35–2:15 | Decision and action | `/console/:id` | timeline, status move, AI-drafted notice or SMS, QR |
| 2:15–2:35 | Reach | `/resident?code=…`, `/board` | the citizen's phone and the public board update at once |
| 2:35–3:00 | Impact | `/console` | AI briefing and KPIs; one honest number; the pitch |

Use measured results only if they were measured. Otherwise label them as targets, estimates or demo metrics.

## The tools

| Tool | Use |
|---|---|
| `/demo` | resets the data and loads the scenario; start every run here |
| `/?present` | the presenter bar (`PresenterMode`): step, caption, timer; navigates to each step's route |
| `/presenter` | speaker notes (`PresenterNotes`) in a second window on the laptop screen; stays in step with the app |
| keys | → / Space / PageDown next · ← / PageUp back · **T** timer · **Esc** hide bar · **P** show bar |
| `/admin/ai` | switch the provider to `demo` in two clicks if the live AI misbehaves |
| `/poster` | the A3 poster; also a good closing slide |

The steps are a `PresenterStep[]` (`{ id, caption, route, notes, seconds }`) kept identical to `DEMO.md`.

## Do

- start from `/demo`; pre-seeded, realistic, coded data
- paste the input; never type long text live
- large text, browser zoom 125–150% on the projector
- show the provider label and the "a person confirms" line: it answers the AI question before it is asked
- keep one scenario; end on impact

## Do not

- start with login or settings
- browse randomly
- wait on a slow API
- show or apologise for unfinished features
- debug on stage

## Backup plan

| Failure | Do |
|---|---|
| live AI slow or failing | `/admin/ai` → `demo`; "this is the offline fallback, same schema, labelled" |
| app crashes on a step | → to the next step; continue the story |
| app will not start | `npm run preview` of the last build; else `docs/screenshots/` from `npm run smoke` |
| projector problems | present from the laptop screen; the poster PDF as the visual |

## Judge questions to prepare

| Question | Short answer source |
|---|---|
| What does the AI decide? Who confirms? | `docs/04-AI-ARCHITECTURE.md` |
| What if the internet is down? | demo provider, labelled fallback; smoke test runs offline |
| Where are the API keys? | only in `.env.local` on the laptop, used by the local relay |
| Is the data real? | `/sources`; synthetic records are coded, no personal data |
| What was built before today? | `docs/DISCLOSURE.md`, `git diff pre-event-freeze..HEAD` |
| How would the city adopt it? | `docs/brief.md`, impact and next steps |
