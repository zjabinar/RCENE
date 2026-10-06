# UI Polish

Use after FEATURE FREEZE (T+3:00), or run `/review-ui`.

```text
Review the golden-path screens in docs/project/DEMO-SCRIPT.md as a competition
judge. Run npm run smoke first and look at docs/screenshots/ (390 and 1280 px,
light and -dark).

Do not rebuild or redesign. Follow skill rcene-design and docs/08-DESIGN-SYSTEM.md.
Improve only:
- visual hierarchy: PageHeader, one primary action per screen
- spacing and typography from the kit, not custom values
- status chips and chart series: colour + icon + text
- loading, empty and error states (IllustratedState, LoadingState)
- AiInsightCard readability: summary first, short reasons, provider label
- 390 px layout (no clipping, no side scroll); 1280 px looks deliberate
- dark mode: replace any hard-coded colour with a token
- Waray and Filipino strings that clip buttons

List the five highest-impact changes with minutes and risk first. Wait for my
OK, then apply them, then npm run typecheck, npm run test, npm run smoke.
```
