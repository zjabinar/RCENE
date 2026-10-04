/**
 * The app's string table, made available to shared components.
 *
 * Shared components (AppShell's footer, SourcesPage, the state views, the map
 * legend…) print `common` keys. They read the table with
 * `useT(useAppStrings())`, so when an app overrides a common key in its own
 * `extendStrings(common, {...})` (e.g. "app.disclaimer"), the override shows up
 * everywhere. AppShell provides it when given `strings`; outside a provider the
 * value is `common`.
 */
import { createContext, useContext, type ReactNode } from "react";

import { common } from "./common.ts";
import type { Lang } from "./index.ts";
import type { Strings } from "./strings.ts";

/** The keys every app table has: the ones in `common`. */
export type CommonTable = (typeof common)["en"];

/** Any string table built with `extendStrings(common, …)`: it has every `common` key, maybe more. */
export type AppStrings = Strings<CommonTable>;

const StringsContext = createContext<AppStrings>(common);

export interface StringsProviderProps<T extends CommonTable> {
  /** The app's table, built with `extendStrings(common, …)`. */
  value: Strings<T>;
  children?: ReactNode;
}

/** Makes `value` the table that shared components read through `useAppStrings()`. */
export function StringsProvider<T extends CommonTable>({ value, children }: StringsProviderProps<T>) {
  const table: AppStrings = value;
  return <StringsContext value={table}>{children}</StringsContext>;
}

/** The nearest provided app table, or `common`. Use as `useT(useAppStrings())`. */
export function useAppStrings(): AppStrings {
  return useContext(StringsContext);
}

const LangOverrideContext = createContext<Lang | null>(null);

export interface LangOverrideProps {
  lang: Lang;
  children?: ReactNode;
}

/**
 * Renders `children` in `lang` whatever the chosen language is: `useT` and
 * `useFormat` inside it use `lang`, and a layout-neutral wrapper
 * (`display: contents`) carries `lang` so screen readers pronounce it right.
 * For side-by-side previews (the gallery shows one block in en, war and fil at
 * once) and print layouts. Not persisted.
 */
export function LangOverride({ lang, children }: LangOverrideProps) {
  return (
    <LangOverrideContext value={lang}>
      <div lang={lang} data-slot="lang-override" style={{ display: "contents" }}>
        {children}
      </div>
    </LangOverrideContext>
  );
}

/** The language forced by the nearest `LangOverride`, or null. */
export function useLangOverride(): Lang | null {
  return useContext(LangOverrideContext);
}
