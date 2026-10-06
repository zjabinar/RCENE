---
description: Score the current build against the RSCENE rubric (AI 20, Innovation 20, Functionality 20, UX/UI 15, Impact 15, Poster 10) and name the top three score-raising actions.
---

# /judge: score against the rubric

Use the `rscene-judge` agent.

Give it: `docs/brief.md`, `DEMO.md`, `STATUS.md`, the latest `docs/screenshots/` (from `npm run smoke`) and the time left.

Return:

1. score per criterion and total, each with evidence (route, screen or file)
2. the top three actions that raise the score most within the time left, with minutes and risk
3. what **not** to build now
4. if after T+3:00: only actions allowed by `/freeze`
