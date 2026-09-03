# RSCENE 2026 AI Vibe Coding Challenge — Competition Codebase Design

- **Date:** 2026-09-03
- **Event:** RSCENE 2026 Regional Smart Communities Exposition, Catbalogan City
- **Competition:** AI Vibe Coding Challenge (Open Category)
- **Event date:** 2026-10-07, Day 2 afternoon, Tandaya Hall
- **Status:** Approved design, pending implementation

## 1. Context

A four-hour solo competition to take an unknown topic from idea to a working web application, plus a project poster and a live demonstration.

### Confirmed constraints

| Constraint | Value | Source |
|---|---|---|
| Duration | 4 hours, hard stop | Event poster |
| Deliverables | Functional web app, project poster, live demo | Event poster |
| Team size | Solo | User decision |
| Stack | JS/TS + React | User decision |
| Runtime AI in app | None; AI use is in the build process only | User decision |
| Demo target | Local only, no deployment | User decision |
| Prepared repo | Permitted | User decision |
| Topic | Unknown until the event | Event format |

### Judging rubric

| Criterion | Weight |
|---|---|
| Effective use of AI technologies | 20% |
| Innovation and creativity | 20% |
| Functionality and technical execution | 20% |
| User experience and interface design | 15% |
| Relevance and practical impact | 15% |
| Presentation and poster quality | 10% |

The official competition site returned HTTP 403 and could not be retrieved. All rules above derive from the event poster. If official rules text becomes available, reconcile this document against it.

## 2. Goals and non-goals

### Goals

1. Eliminate project setup from the four-hour window.
2. Pre-make every decision that does not depend on the topic.
3. Capture AI-use evidence as a byproduct of working, not as an end-of-session reconstruction.
4. Protect time for the poster and demo, which are 10% of the score and are what solo competitors most reliably run out of time for.

### Non-goals

- No domain or feature code. The scaffold stays a generic starter.
- No deployment configuration. The demo is local.
- No runtime AI integration, no API keys, no server routes.
- No backend or database. State is client-side.

## 3. Repository layout

```
C:\RSCENE\
├─ CLAUDE.md              Scaffold inventory and rules of engagement
├─ README.md              What this repo is, how to start on the day
├─ .gitignore
├─ app/                   Vite + React + TS application
├─ docs/
│  ├─ RUNBOOK.md          Minute-by-minute four-hour plan
│  ├─ AI-LOG.md           Prompt and decision ledger
│  ├─ ARCHETYPES.md       Likely topics mapped to modules to keep
│  ├─ DEMO-SCRIPT.md      Presentation skeleton
│  └─ superpowers/specs/  This document
├─ poster/                Poster deliverable and content outline
├─ assets/                Event images
└─ reference/
   └─ everything-claude-code/   ECC source clone (gitignored)
```

The ECC clone moves from the repository root into `reference/` and is gitignored. It is 108 MB of reading material and is not part of the project; the installed plugin operates from its own cache at `~/.claude/plugins/marketplaces/ecc/` and does not depend on this clone.

## 4. Application scaffold

### 4.1 Stack

Vite + React + TypeScript + Tailwind + shadcn/ui.

Vite is chosen over Next.js because the demo is local-only, so server-side rendering provides no benefit, while the Next server/client component boundary is a common source of hard-to-read errors under time pressure. Vite has a faster dev server and more legible failure modes.

Versions are pinned to whatever is current at build time and verified by an actual install and production build, not assumed from a template.

### 4.2 Modules

Every module is generic. None encodes domain logic.

| Module | Library | Rationale |
|---|---|---|
| Routing and layout shell | React Router | Nav, sidebar, page frame |
| Component library | shadcn/ui | Button, card, dialog, table, tabs, form, toast, select |
| Forms and validation | react-hook-form + zod | Most civic applications take user input |
| Data tables | TanStack Table | Sorting and filtering wrapper |
| Charts | Recharts | Themed defaults for dashboard-shaped topics |
| Maps | react-leaflet | Smart LGU topics are frequently geographic |
| State and persistence | zustand + localStorage | No backend; survives refresh |
| Mock data | Seed helper | Demo data without a database |
| UI states | Loading, empty, error components | Carries the 15% UX score |
| Icons | lucide-react | Ships with shadcn/ui |

### 4.3 Bloat management

A fat scaffold is a liability if it must be rediscovered or if unused parts linger. Four mitigations, all required:

1. **CLAUDE.md carries a precise inventory** — every module, its path, and a usage snippet. Claude reads the map rather than exploring.
2. **Each module is self-contained** in its own folder, with a header comment stating it is safe to delete if unused.
3. **A strip step in the first 15 minutes.** Once the topic is known, unused modules are deleted outright.
4. **Every module ships a demo route** that is deleted along with it, so nothing is left half-wired.

## 5. Competition-day ECC configuration

The ECC plugin is installed at user scope with `hooks_enabled: true` and `hook_profile: standard`. During this session, the GateGuard fact-forcing hook blocked work three times — twice on Bash and once on Write — each time requiring a fact statement before proceeding. This is a reasonable guardrail for normal work and a measurable cost against a four-hour clock.

`CLAUDE.md` documents a competition-day switch to the `minimal` hook profile, with `ECC_GATEGUARD=off` as a narrower alternative.

High-value ECC skills for this stack, to be listed in CLAUDE.md: `ecc:react-build`, `ecc:react-review`, `ecc:frontend-patterns`, `ecc:react-patterns`, `ecc:make-interfaces-feel-better`.

## 6. Non-code deliverables

### 6.1 RUNBOOK.md

| Window | Duration | Activity |
|---|---|---|
| T+0:00–0:20 | 20 min | Topic intake. One-sentence problem statement, three user stories, MVP scope. Choose modules to keep. |
| T+0:20–0:35 | 15 min | Strip unused modules, rename app, commit baseline. |
| T+0:35–2:45 | 130 min | Build the core loop. Commit every working increment. |
| T+2:45 | — | **Hard feature freeze.** No new features after this point. |
| T+2:45–3:15 | 30 min | Polish: loading, empty and error states; responsive check; seed demo data. |
| T+3:15–3:45 | 30 min | Poster. |
| T+3:45–4:00 | 15 min | Demo rehearsal and buffer. |

The feature freeze is the single most important line in the document. A partially built feature at the demo scores worse than a smaller finished one across functionality, UX and impact simultaneously.

### 6.2 AI-LOG.md

An append-as-you-go ledger, written at each commit: what was asked, what Claude produced, what was kept or rejected and why. With no runtime AI in the application, this file is the sole evidence base for the 20% "Effective use of AI technologies" criterion, and it cannot be reconstructed credibly after the fact.

### 6.3 ARCHETYPES.md

A one-page cheat sheet mapping likely Smart LGU topic shapes — service request and tracking, geographic and mapping, dashboard and reporting, form-driven intake, directory and search — to the scaffold modules each needs and the ones each can delete.

### 6.4 DEMO-SCRIPT.md

A presentation skeleton: problem, solution, live walkthrough, AI process narrative, impact. Sized to a short slot, with the AI process section explicitly present because it is separately scored.

### 6.5 poster/

Content outline covering problem statement, AI tools used, development process, and potential impact, per the stated competition poster requirements. The poster itself is produced on the day.

## 7. Verification criteria

The scaffold is not complete until all of the following pass:

1. `npm install` completes without errors.
2. The dev server boots and serves the application.
3. `npm run build` produces a production build without errors.
4. Every demo route renders without console errors.
5. TypeScript reports no errors.

A scaffold that does not build on the day is worse than no scaffold. These checks are run and their output confirmed before the work is called done.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Scope creep leaves nothing working at demo time | Hard feature freeze at T+2:45 |
| Poster and demo neglected | Protected time blocks in the runbook |
| AI-use evidence not captured | AI-LOG.md written at every commit |
| Scaffold modules unused and in the way | Strip step at T+0:20 |
| ECC hooks slow work under time pressure | Documented switch to minimal profile |
| Dependency rot between now and October | Re-run verification criteria before the event |
