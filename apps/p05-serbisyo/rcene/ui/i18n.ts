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
    "ui.theme": "Theme",
    "ui.theme.mode": "Light or dark",
    "ui.mode.light": "Light",
    "ui.mode.dark": "Dark",
    "ui.mode.system": "Device setting",
    "ui.theme.palette": "Colours",
    "ui.theme.locked": "This view sets its own colours.",
    "ui.palette.habi": "Habi",
    "ui.palette.habi.note": "Woven abaca and sea teal (default)",
    "ui.palette.dagat": "Dagat",
    "ui.palette.dagat.note": "Sea blues for coastal views",
    "ui.palette.fiesta": "Fiesta",
    "ui.palette.fiesta.note": "Banig magenta and tikog green",
    "ui.palette.gabi": "Gabi",
    "ui.palette.gabi.note": "Night showcase in neon",
    "ui.palette.malinaw": "Malinaw",
    "ui.palette.malinaw.note": "High contrast for boards and low vision",
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
    "ui.theme": "Tema",
    "ui.theme.mode": "Mahayag o madulom",
    "ui.mode.light": "Mahayag",
    "ui.mode.dark": "Madulom",
    "ui.mode.system": "Sumala ha device",
    "ui.theme.palette": "Mga kolor",
    "ui.theme.locked": "Ini nga view may kalugaringon nga mga kolor.",
    "ui.palette.habi": "Habi",
    "ui.palette.habi.note": "Hinabol nga abaka ngan asul-berde han dagat (default)",
    "ui.palette.dagat": "Dagat",
    "ui.palette.dagat.note": "Mga asul han dagat para ha baybayon",
    "ui.palette.fiesta": "Fiesta",
    "ui.palette.fiesta.note": "Magenta han banig ngan berde han tikog",
    "ui.palette.gabi": "Gabi",
    "ui.palette.gabi.note": "Neon ha gab-i para ha pagpakita",
    "ui.palette.malinaw": "Malinaw",
    "ui.palette.malinaw.note": "Hayag nga kalainan para ha mga board ngan maluya nga panan-aw",
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
    "ui.theme": "Tema",
    "ui.theme.mode": "Maliwanag o madilim",
    "ui.mode.light": "Maliwanag",
    "ui.mode.dark": "Madilim",
    "ui.mode.system": "Ayon sa device",
    "ui.theme.palette": "Mga kulay",
    "ui.theme.locked": "May sariling kulay ang view na ito.",
    "ui.palette.habi": "Habi",
    "ui.palette.habi.note": "Hinabing abaka at asul-berdeng dagat (default)",
    "ui.palette.dagat": "Dagat",
    "ui.palette.dagat.note": "Mga asul ng dagat para sa baybayin",
    "ui.palette.fiesta": "Fiesta",
    "ui.palette.fiesta.note": "Magenta ng banig at berde ng tikog",
    "ui.palette.gabi": "Gabi",
    "ui.palette.gabi.note": "Neon sa gabi para sa pagtatanghal",
    "ui.palette.malinaw": "Malinaw",
    "ui.palette.malinaw.note": "Mataas na contrast para sa mga board at mahinang paningin",
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
