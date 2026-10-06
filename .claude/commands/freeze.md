---
description: Declare FEATURE FREEZE (T+3:00) and switch to hardening only - demo path, AI fallback, states, smoke, poster.
---

# /freeze: FEATURE FREEZE

1. In `STATUS.md` set "Feature freeze: YES" with the time (T+h:mm).
2. From now on, only: bug fixes, UX fixes, reliability, demo, poster, presentation. Refuse new features and screens; add any idea to "Explicitly deferred" in `docs/plan.md` instead. Use the `rscene-scope-guardian` agent if unsure.
3. Check, in this order, and report each finding as P0 (demo blocked), P1 (judge will notice) or P2 (cosmetic):
   1. the golden path in `DEMO.md`, end to end
   2. `/demo` resets the data and loads the scenario; "Reset demo" works
   3. AI fallback: on `/admin/ai` pick a provider that shows "not configured", or turn Wi-Fi off. Every AI card on the golden path still answers, shows provider, model and latency, says "fallback", and says "AI suggestion — a person confirms"
   4. loading, empty and error states on the golden-path screens
   5. 390 px and 1280 px, light and dark
   6. `npm run smoke`
   7. `/poster` fits one A3 page; the `/presenter` steps match the demo script
4. Fix P0 now, then P1 while time allows. Re-run `npm run smoke` after fixes.
5. If not done yet, suggest `/checkpoint integration-working`.
