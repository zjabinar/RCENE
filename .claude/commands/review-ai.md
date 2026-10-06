---
description: Review the AI features (defineAiTask tasks, prompts, demo fallback, AiInsightCard display, human confirmation) and return the five highest-impact fixes.
---

# /review-ai: review the AI

Use the `rscene-ai-reviewer` agent with `docs/04-AI-ARCHITECTURE.md`, `rcene/ai/`, and the screens that call AI (`/console`, `/admin/lab`, `/console/:id`, `/admin/ai`, `/admin/lab`).

Return the five highest-impact improvements, each with file, change, minutes and which rubric line it raises (AI 20%, Innovation 20%).

Then implement only the ones I approve. After FEATURE FREEZE, only fixes to reliability, labels and the fallback are allowed. Verify with `npm run test` and on `/admin/lab`.
