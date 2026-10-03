/**
 * Three-language string tables: English (source), Waray (Winaray), Filipino.
 * Every user-facing string in an app goes through a table — no hard-coded text.
 *
 *   // apps/NN-slug/src/i18n/strings.ts
 *   export const strings = extendStrings(common, {
 *     en: { "home.title": "Is my place at risk?" },
 *     war: { "home.title": "..." },   // AI-drafted Waray: list it in REVIEW.md
 *     fil: { "home.title": "..." },
 *   });
 *
 *   // in a component
 *   const t = useT(strings);
 *   t("home.title"); t("distance.straightLine", { km: "1.2" });
 *
 * Missing Waray/Filipino entries fall back to English (with a dev warning).
 */
import { useEffect } from "react";
import { createSyncedStore } from "@rcene/store";

import type { StringTable, Strings } from "./strings.ts";

export { common, FORBIDDEN_ANSWER_WORDS } from "./common.ts";
export * from "./strings.ts";

export const LANGS = ["en", "war", "fil"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = { en: "English", war: "Winaray", fil: "Filipino" };

/** Intl locales. Intl has no Waray locale, so Waray formats numbers and dates like Filipino. */
export const LOCALES: Record<Lang, string> = { en: "en-PH", war: "fil-PH", fil: "fil-PH" };

export type Vars = Record<string, string | number>;

const warned = new Set<string>();

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** Non-hook translation, for tests and code outside components. */
export function translate<T extends StringTable>(strings: Strings<T>, lang: Lang, key: keyof T & string, vars?: Vars): string {
  const localized = lang === "en" ? undefined : strings[lang][key];
  if (localized === undefined && lang !== "en" && import.meta.env?.DEV && !warned.has(`${lang}:${key}`)) {
    warned.add(`${lang}:${key}`);
    console.warn(`[i18n] Missing ${lang} string for "${key}"; showing English.`);
  }
  const text = localized ?? strings.en[key];
  if (text === undefined) return key;
  return interpolate(text, vars);
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

/** The chosen language, persisted and synced across this app's windows. */
export const useLangStore = createSyncedStore<LangState>("lang", (set) => ({
  lang: "en",
  setLang: (lang) => set({ lang }),
}));

/** [lang, setLang]. Also keeps <html lang> in step for screen readers. */
export function useLang(): [Lang, (lang: Lang) => void] {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return [lang, setLang];
}

export function useT<T extends StringTable>(strings: Strings<T>) {
  const lang = useLangStore((s) => s.lang);
  return (key: keyof T & string, vars?: Vars) => translate(strings, lang, key, vars);
}

/** Locale-aware formatters for the active language. */
export function useFormat() {
  const lang = useLangStore((s) => s.lang);
  const locale = LOCALES[lang];
  return {
    number: (n: number, digits = 0) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n),
    km: (km: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km),
    percent: (share: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(share),
    date: (d: Date | number) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d),
    time: (d: Date | number) => new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(d),
  };
}
