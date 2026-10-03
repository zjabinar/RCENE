# @rcene/i18n

English (source), Waray (`war`, Winaray) and Filipino (`fil`). Every user-facing string goes through a table.

```ts
// apps/<slug>/src/i18n/strings.ts
import { common, extendStrings } from "@rcene/i18n";
export const strings = extendStrings(common, {
  en: { "home.title": "Where do I go?" },
  war: { "home.title": "…" },   // AI-drafted → add to REVIEW.md for a fluent reviewer
  fil: { "home.title": "…" },
});

// component
const t = useT(strings);
t("home.title"); t("distance.straightLine", { km: fmt.km(1.24) });
const [lang, setLang] = useLang();   // persisted, synced across windows, sets <html lang>
const fmt = useFormat();             // number, km, percent, date, time for the active language
```

- `common` holds chrome, UI states, hazard and level names and the three answer phrases (`status.inZone` with `{level}`, `status.notInZone`, `status.outsideCoverage`).
- Missing `war`/`fil` entries fall back to English with a dev warning.
- **Tested rule:** no `status.*` string in any language contains "safe", "ligtas", "luwas", "salbo" or "sigurado". Don't write a "safe" answer anywhere else either.
- Waray is a first-class language, not an afterthought. AI drafts it; a human corrects it. Keep the before/after — it's a poster panel ("what the AI got wrong in Waray").
