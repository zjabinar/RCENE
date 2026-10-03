/**
 * Strings used only inside @rcene/ui that `common` does not have.
 *
 * Waray "ui.close" is intentionally absent (falls back to English) until a
 * fluent speaker supplies it; "ui.home" reuses the template's "nav.home"
 * wording. The other Waray and Filipino entries are AI drafts: they are listed
 * in rcene/i18n/REVIEW.md for a fluent reviewer.
 */
import { useMemo } from "react";
import { common, extendStrings, useAppStrings } from "@rcene/i18n";

export const uiStrings = extendStrings(common, {
  en: {
    "ui.close": "Close",
    "ui.home": "Home",
    "ui.cancel": "Cancel",
    "ui.confirm": "Confirm",
    "ui.search": "Search",
    "ui.searchHint": "Type to search, then choose a result with the arrow keys and Enter.",
    "ui.suggestions": "Suggestions",
    "ui.noResults": "No results found.",
    "ui.notifications": "Notifications",
    "ui.open": "Open",
    "ui.newWindow": "New window",
    "ui.openRole": "Open {role}",
    "ui.openRoleWindow": "Open {role} in a new window",
  },
  war: {
    "ui.home": "Puno",
    "ui.cancel": "Kanselaha",
    "ui.confirm": "Kumpirmaha",
    "ui.search": "Bilnga",
    "ui.searchHint": "I-type an imo ginbibiling, dayon pilia an resulta gamit an arrow keys ngan Enter.",
    "ui.suggestions": "Mga suhestyon",
    "ui.noResults": "Waray nakita nga resulta.",
    "ui.notifications": "Mga pahibaro",
    "ui.open": "Ablihi",
    "ui.newWindow": "Bag-o nga window",
    "ui.openRole": "Ablihi an {role}",
    "ui.openRoleWindow": "Ablihi an {role} ha bag-o nga window",
  },
  fil: {
    "ui.close": "Isara",
    "ui.home": "Home",
    "ui.cancel": "Kanselahin",
    "ui.confirm": "Kumpirmahin",
    "ui.search": "Maghanap",
    "ui.searchHint": "Mag-type para maghanap, saka pumili ng resulta gamit ang arrow keys at Enter.",
    "ui.suggestions": "Mga mungkahi",
    "ui.noResults": "Walang nakitang resulta.",
    "ui.notifications": "Mga abiso",
    "ui.open": "Buksan",
    "ui.newWindow": "Bagong window",
    "ui.openRole": "Buksan ang {role}",
    "ui.openRoleWindow": "Buksan ang {role} sa bagong window",
  },
});

export type UiStrings = typeof uiStrings;

/**
 * `uiStrings` with the app's table (from `useAppStrings()`) layered on top, so a
 * component that prints both ui.* and common keys honours the app's overrides.
 */
export function useUiStrings(): UiStrings {
  const app = useAppStrings();
  return useMemo(() => {
    if (app === common) return uiStrings;
    return {
      en: { ...uiStrings.en, ...app.en },
      war: { ...uiStrings.war, ...app.war },
      fil: { ...uiStrings.fil, ...app.fil },
    };
  }, [app]);
}
