# Status — Andam Catbalogan

Phase: plan
Done: restructure (single app at the root, `sources/`); the P1 scaffold builds, tests and smoke pass on fixtures. Ported from RSCENE_Vibecoding: `@rcene/ai` (+ relay), `/admin` (AI provider, AI lab, appearance, demo data), `/demo`, `/presenter`, `/poster`, process agents/commands/skills.
Next: rest of the admin layer (users, audit log, settings, CRUD for common information), then R1–R5 from `docs/brief.md`; update the demo steps (`src/features/demo/demo-steps.ts`) as the role views land.
Blockers: none. All layers are still fixtures (raw GIS is in `sources/gis/raw`, not converted yet).

<!--
Keep this short, current and honest:
  Phase: plan | domain | features | verify | polish | done
  Done: requirement IDs finished (e.g. R1.1, R1.2)
  Next: the next concrete step
  Blockers: anything waiting on data, shared code, a model download or a human
A resumed session reads this first (the SessionStart hook prints it).
-->
