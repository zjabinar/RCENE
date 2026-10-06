# Domain logic

Pure functions only — no React, no DOM, no fetch. Each file gets a `*.test.ts`
next to it, written first (the brief lists which functions to test-drive).
Reuse `@rcene/geo` for geometry; put this app's rules (eligibility, scoring,
scenario effects, queue rules) here.
