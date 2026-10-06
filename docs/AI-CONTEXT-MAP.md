# AI context map — where each kind of context lives

Adapted from the SSU ERMS context refactor (`C:\ssu\docs\AI_CONTEXT_MAP.md`): a **lean always-on core**, **on-demand skills**, and **one home per kind of fact**, so nothing is written twice and `CLAUDE.md` stays small. `/save-session` routes new takeaways by this map.

## Layers

| Layer | Lives in | Loaded | Holds |
|---|---|---|---|
| Always-on core | `CLAUDE.md` (~9 KB) | every session | priorities, how we work, routes and files, AI rules, build rules, safety |
| Session handoff | `STATUS.md` (≤ 4 KB) | every session, printed by the SessionStart hook | where we are now, what's broken, in flight, next action |
| On-demand skills | `.claude/skills/*` | when the work matches a skill's `description` | how-tos: `ai-feature`, `ui-builder`, `rcene-design`, `demo-data`, `poster`, `presentation`, `demo-qa`, `maplibre-gis`, `offline-ai`, `gsap-motion` |
| Commands | `.claude/commands/*` | when typed | `/review-ai`, `/review-ui`, `/qa`, `/judge`, `/freeze`, `/demo`, `/checkpoint`, `/save-session` |
| Review agents | `.claude/agents/rscene-*` | when spawned | read-only architect, scope guardian, AI/UI reviewers, QA, judge, demo coach |
| Playbooks | `docs/02`, `04`, `05`, `08`, `docs/AI-PROVIDERS.md`, `sources/deploy/README.md` (reference) | read on demand | the runbook, AI architecture, demo, design system, provider setup, hosting (reference) |
| The day's plan | `docs/brief.md`, `docs/plan.md`, `DEMO.md`, `docs/POSTER-CONTENT.md` | read on demand | brief, MVP, AI workflow, demo script, poster content |
| Decisions and changes | `NOTES.md` | read on demand | decisions and why, shared-code changes, translations to review, open questions |
| AI evidence | `AI-LOG.md` | read on demand | one row per commit: asked, produced, kept/changed/rejected |
| Library docs | `rcene/*/README.md` | read on demand | API of each shared library |
| Machine and user facts | Claude's auto-memory for this folder | recalled by relevance | preferences, environment quirks, lasting facts not in the repo |

## Where does a new fact go?

- Always do / never do, every session → one line in `CLAUDE.md`.
- How to do X again → a skill (`.claude/skills/<topic>/SKILL.md`, precise `description`).
- What is true now, this session → `STATUS.md`; lasting decision → `NOTES.md`; about the machine or the user → memory.
- The topic's plan → `docs/brief.md` and `docs/plan.md`.
- Secrets → nowhere (key names only).

## Session loop

```text
work ──/save-session──▶ STATUS.md (+ routed notes) ──/compact or /clear──▶ new session
  ▲                                                                          │
  └──────────── SessionStart hook prints project info + STATUS.md ◀──────────┘
milestones: /checkpoint = checks + STATUS.md + AI-LOG row (from "For the next AI-LOG row") + commit
```

Use `/save-session quick` during the four hours (handoff only, about a minute); the full form when the session taught something worth keeping.
