# @rcene/i18n

English (source), Waray (`war`, Winaray) and Filipino (`fil`). Every user-facing string goes through a table.

> **This folder is the app's own copy of the shared code.** Use it as-is where you can. If you change it, keep the change minimal and list it in `NOTES.md` under "Shared-code changes (for the template)".

```ts
// src/i18n/strings.ts
import { common, extendStrings } from "@rcene/i18n";
export const strings = extendStrings(common, {
  en: { "home.title": "Where do I go?" },
  war: { "home.title": "…" },   // AI-drafted → list it in NOTES.md under "Translations to review"
  fil: { "home.title": "…" },
});

// component
const t = useT(strings);
t("home.title"); t("distance.straightLine", { km: fmt.km(1.24) });
const [lang, setLang] = useLang();   // persisted, synced across windows, sets <html lang>
const fmt = useFormat();             // number, km, percent, currency, date, time for the active language
```

- `common` holds chrome, UI states, hazard and level names and the three answer phrases (`status.inZone` with `{level}`, `status.notInZone`, `status.outsideCoverage`).
- Missing `war`/`fil` entries fall back to English with a dev warning (`console.warn`, once per key).
- **Tested rule:** no `status.*` string in any language contains "safe", "ligtas", "luwas", "salbo" or "sigurado". Don't write a "safe" answer anywhere else either.
- Waray is a first-class language, not an afterthought. AI drafts it; a human corrects it. Keep the before/after in `REVIEW.md` — it's a poster panel ("what the AI got wrong in Waray").

## API

| Export | What |
|---|---|
| `common` | The shared table (`Strings<CommonTable>`) |
| `defineStrings({ en, war?, fil? })` | A table from scratch (rarely needed) |
| `extendStrings(base, { en, war?, fil? })` | `base` plus the app's keys, merged **per language**; an app key with the same name as a `common` key overrides it |
| `useT(strings)` | `t(key, vars?)` for the active language; `{name}` placeholders are filled from `vars`, unknown ones stay visible |
| `translate(strings, lang, key, vars?)` | Non-hook `t`, for tests and domain code |
| `useLang()` | `[lang, setLang]`; persisted in the `lang` store, synced across windows, keeps `<html lang>` in step |
| `useLangStore` | The underlying store (`useLangStore.setState({ lang: "fil" })` in tests) |
| `LANGS`, `type Lang`, `LANG_LABELS`, `LOCALES` | `["en", "war", "fil"]`, their names, their Intl locales (`en-PH`, `fil-PH`; Waray formats like Filipino) |
| `useFormat()` | `{ number(n, digits = 0), km(km), percent(share), currency(n, digits = 2), date(d), time(d) }` |
| `formatCurrency(n, lang, digits = 2)` | Non-hook pesos: `formatCurrency(1728.75, "fil") === "₱1,728.75"` (same in `en`) |
| `StringsProvider` | `{ value: Strings<T>; children }`: makes `value` the table shared components read |
| `useAppStrings()` | The nearest provided table, or `common` |
| `type AppStrings`, `type CommonTable` | `Strings<CommonTable>`: any table built with `extendStrings(common, …)` |
| `FORBIDDEN_ANSWER_WORDS` | The words a hazard answer must never contain |

### Money

`useFormat().currency(n)` and `formatCurrency(n, lang)` use `Intl.NumberFormat(locale, { style: "currency", currency: "PHP" })`, so they print `₱1,728.75` with the locale's grouping. Use them for display only; keep amounts as numbers in state and in CSV exports.

### App strings in shared components

Shared components (`AppShell`'s footer, `SourcesPage`, the state views, the hazard badges, `LangToggle`, the map legend…) don't import your table. They read the nearest one with `useT(useAppStrings())`. `AppShell strings={strings}` provides it (the template's `AppLayout` does this), so overriding a `common` key in your table changes it everywhere:

```ts
export const strings = extendStrings(common, {
  en: { "app.disclaimer": "Training tool for barangay drills. Follow official CDRRMO advisories." },
  war: { "app.disclaimer": "…" },
  fil: { "app.disclaimer": "…" },
});
```

- Override a `common` key **in all three languages**: the merge is per language, so a language you leave out keeps the `common` text.
- Your own shared-style components can do the same: `const t = useT(useAppStrings())` for `common` keys, or `useT(strings)` for app keys.
- Outside the shell (e.g. a route `errorElement`), wrap the router in `<StringsProvider value={strings}>` if you need the overrides there.
- `AppShell disclaimer={t("…")}` replaces only the disclaimer and wins over `strings`.
