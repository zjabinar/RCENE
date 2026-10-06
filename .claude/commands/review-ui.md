---
description: Review the visible UI on the golden path as a judge would (kit blocks, tokens, states, 390/1280, dark mode) and apply only safe high-impact fixes.
---

# /review-ui: review the visible UI

1. Run `npm run smoke` if `docs/screenshots/` is older than the last change.
2. Use the `rscene-ui-reviewer` agent on the golden-path screens in `DEMO.md` and their screenshots in `docs/screenshots/` (390 px, 1280 px, light and `-dark`).
3. It returns the five highest-impact changes. Implement only those that are safe in the time left, using kit blocks and theme tokens (skill `rcene-design`); no redesigns, no new visual language.
4. After the changes: `npm run typecheck`, `npm run test`, `npm run smoke`.
