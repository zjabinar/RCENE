---
description: Save this session's state and durable takeaways (STATUS.md handoff + routed notes) so /compact, /clear or a new session loses nothing — without bloating CLAUDE.md. "quick" = handoff only.
argument-hint: "[quick | optional focus, e.g. \"AI triage\" or \"VPS deploy\"]"
---

# /save-session — persist state and takeaways

Argument: $ARGUMENTS

Goal: after this command it is safe to `/compact` or `/clear`. A new session gets `STATUS.md` printed automatically by the SessionStart hook (`scripts/hooks/session-context.mjs`, ~9.5 KB budget), so **`STATUS.md` is the handoff**; everything else is routed to its proper home. This command **does not commit** (that is `/checkpoint`) and **writes no code**.

If the argument is `quick` (the four-hour clock is running): do **step 1 only**, then report. Otherwise do steps 1–3. A focus word narrows step 2 to that topic.

## 1. The handoff: rewrite `STATUS.md`

Use the headings of `STATUS.md`. Fill them from what is true **now**:

- **Last updated**: clock time, and T+h:mm on competition day.
- **Milestone / Phase / Feature freeze**: as in `docs/02-FOUR-HOUR-RUNBOOK.md`.
- **Working**: only what was verified this session, with how (`npm run test`, smoke, click-through). Anything else goes under Broken or is marked "unverified".
- **Broken**: symptom + where (file/route) + what was tried.
- **In flight (uncommitted)**: from `git status --short`, grouped by purpose ("AI triage prompt for the topic: src/domain/triage.ts, src/i18n/strings.ts"). Say whether it is finished.
- **Demo path**: the current golden path in 3–6 steps.
- **AI provider in use**: provider + model + last connection-test result (never a key).
- **Blockers / waiting on**: decisions for the human, organizers' answers, external things.
- **Next action**: 1–3 concrete steps a fresh session can start on without asking (file + route + done-when).
- **For the next AI-LOG row**: what was asked, what AI produced, what the human kept/changed/rejected since the last commit. `/checkpoint` turns this into the `AI-LOG.md` row and clears it.
- **Last commit**: `git log -1 --format="%h %s"`.

Keep it **≤ 70 lines and ≤ 4 KB** (the hook truncates beyond its budget). Replace stale content; don't append history (history is `git log` + `AI-LOG.md`).

## 2. Route durable takeaways by type — not into CLAUDE.md by default

| What was learned | Where it goes | Note |
|---|---|---|
| A rule **every** session must follow | `CLAUDE.md` — **one short line** in the right section | Detail goes to a skill or doc; cite it |
| A reusable **how-to / pattern** for a kind of work | the matching skill in `.claude/skills/` (`ai-feature`, `ui-builder`, `rcene-design`, `demo-data`, `poster`, `presentation`, `demo-qa`, `maplibre-gis`, `offline-ai`, `gsap-motion`) or a new `.claude/skills/<topic>/SKILL.md` with a precise `description:` | Keep the `description` accurate so it auto-loads |
| A **decision** about this entry (and why), an open question | `NOTES.md` → "Decisions" / "Requests / open questions" | One bullet, the why included |
| A change to **shared code** (`rcene/`, `scripts/`) | `NOTES.md` → "Shared-code changes" | So it can be carried back to `C:\RSCENE` |
| AI-drafted Waray / Filipino text | `NOTES.md` → "Translations to review" | |
| The topic's **plan** changed (scope, MVP, AI workflow, demo, poster copy, re-skin map) | `docs/brief.md`, `docs/plan.md`, `DEMO.md`, `docs/POSTER-CONTENT.md` | The day's source of truth |
| A fact about the **machine, tools or the user's preferences** (disk, ports, keys present, how the user likes to work) | the auto-memory directory from the system prompt (one file + one line in `MEMORY.md`) | Not in the repo |
| A credential, key, password, token | **nowhere** | Key *names* only, never values |

Decision shortcut: "what is true now" → `STATUS.md` (this session) or `NOTES.md`/memory (lasting); "how to do X again" → a skill; "always do / never do" → one line in `CLAUDE.md`.

Rules:
1. **Search before writing** (`grep -rn` the topic in `CLAUDE.md`, `NOTES.md`, `docs/`, `.claude/skills/`): update the existing entry instead of adding a duplicate.
2. **Be concise**: the decision or pattern and its *why*, not the transcript.
3. **Honest**: no "fixed" or "working" without evidence from this session.
4. **No secrets, no personal names**, in any file.
5. After FEATURE FREEZE, don't record new scope as a plan; record it as "deferred" in `NOTES.md`.

## 3. Check and report

- List exactly **what changed and where** (file paths, one line each).
- Report sizes: `CLAUDE.md` (KB, lines) — confirm it **did not grow by more than one line**; `STATUS.md` (KB, lines) — confirm it is **≤ 4 KB**. If a pattern landed in `CLAUDE.md`, move it to a skill.
- If `git status` shows meaningful uncommitted work, suggest `/checkpoint <milestone>` (don't run it).
- End with: "Saved. Safe to `/compact` or `/clear`; the next session starts from `STATUS.md`."
