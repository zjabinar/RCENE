# Waray and Filipino review log

All `war` and `fil` strings in `rcene/i18n/common.ts`, `rcene/ui/i18n.ts`, the design kit
(`rcene/kit/*/strings.ts`) and the app's `src/i18n/strings.ts` were drafted by AI. A fluent speaker must review them before the demo.

Record every correction here (newest last). The before/after list is evidence for the
"Effective use of AI" criterion and a poster panel.

| Date | Key | Lang | AI draft | Corrected | Reviewer | Note |
|---|---|---|---|---|---|---|

## Status

- `rcene/i18n/common.ts` — **not yet reviewed** (drafted 2026-10-03).
- `rcene/ui/i18n.ts` — **not yet reviewed**. `ui.cancel`, `ui.confirm`, `ui.search`, `ui.searchHint`,
  `ui.suggestions`, `ui.noResults`, `ui.notifications`, `ui.open`, `ui.newWindow`, `ui.openRole`,
  `ui.openRoleWindow` drafted 2026-10-03 in Waray and Filipino.
  Waray `ui.close` is still missing on purpose (English shows until a fluent speaker supplies it).
  Theme menu strings drafted 2026-10-04: `ui.theme`, `ui.theme.mode`, `ui.mode.light|dark|system`,
  `ui.theme.palette`, `ui.theme.locked`, `ui.palette.<habi|dagat|fiesta|gabi|malinaw>` and their `.note`.
- `rcene/kit/*/strings.ts` — **not yet reviewed** (drafted 2026-10-04; 130 keys, all `kit.*`).
  Review the visible labels first, in this order:
  1. `kit/app/strings.ts` (73): `kit.table.*`, `kit.wizard.*`, `kit.form.*` and `kit.form.error.*`
     (validation messages), `kit.capacity.*`, `kit.timeline.*`, `kit.board.*`, `kit.qr.*`, `kit.chart.*`,
     `kit.console.*`, `kit.pageHeader.breadcrumbs`.
  2. `kit/poster/strings.ts` (43): `kit.poster.panel.*` (the six poster headings), `kit.aiBuilt.*`
     (the disclosure line), `kit.presenter.*`, `kit.printButton.label`, `kit.posterFigure.*`, `kit.qrToApp.*`.
  3. `kit/site/strings.ts` (11): `kit.site.*`, `kit.scrolly.*`, `kit.beforeAfter.*`.
  4. `kit/brand/strings.ts` (3): `kit.brand.place` ("Catbalogan City"); `kit.brand.name` stays "RCENE".
  An app can reword any kit label by adding the same key to its `src/i18n/strings.ts`.
