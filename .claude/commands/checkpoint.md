---
description: Save a milestone - run the checks, update STATUS.md, append an AI-LOG.md row, and commit with the milestone name (baseline, mvp-working, ai-working, integration-working, competition-final).
argument-hint: <baseline | reskin | mvp-working | ai-working | integration-working | competition-final>
---

# /checkpoint: save a milestone

Milestone: $ARGUMENTS

If empty, propose one from `STATUS.md` and the runbook (`docs/02-FOUR-HOUR-RUNBOOK.md`) and ask me to confirm.

1. **Checks.** `npm run typecheck` and `npm run test`. For `integration-working` and `competition-final` also `npm run smoke`. If a check fails, report it and do not commit unless I say "commit anyway" (then list it under "Broken" in `STATUS.md`).
2. **`STATUS.md`.** Rewrite it with the headings of `STATUS.md` (the same handoff `/save-session` writes): last updated (clock time and T+h:mm), milestone, phase, working, broken, in flight (empty after this commit), demo path, AI provider in use, blockers, next action, feature freeze YES/NO, last commit. Keep it ≤ 4 KB.
3. **`AI-LOG.md`.** Append one row: `| When | Commit | Asked / goal | AI produced | Human decision |`. Start from the notes under "For the next AI-LOG row" in `STATUS.md` (left there by `/save-session`), then clear that section. Be honest about what a person kept, changed or rejected. In the Commit column write the commit message's first word (the milestone); the SHA is not known yet and `git log` finds it.
4. **No secrets.** `git status --short` must not list `.env`, `.env.local` or any key file. Search the staged diff for key-looking strings (`sk-`, `AIza`, `_API_KEY=`) and stop if one is found.
5. **Commit.** `git add -A`, then `git commit -m "<milestone>: <one-line summary>"`. Do not push unless I ask.
6. For `competition-final` also run `git tag competition-final`.
7. Reply with the short SHA, the checks' results and the next action.
