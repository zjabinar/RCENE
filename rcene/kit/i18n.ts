/**
 * The kit's string table: common + ui strings + every block family's strings.
 * Blocks read it with `useT(useKitStrings())`, which layers the app's own table
 * (AppShell `strings`) on top, so an app can reword any kit string.
 */
import { useMemo } from "react";
import { extendStrings, useAppStrings } from "@rcene/i18n";
import { uiStrings } from "../ui/i18n.ts";

import { appStrings } from "./app/strings.ts";
import { brandStrings } from "./brand/strings.ts";
import { posterStrings } from "./poster/strings.ts";
import { siteStrings } from "./site/strings.ts";

export const kitStrings = extendStrings(uiStrings, {
  en: { ...appStrings.en, ...siteStrings.en, ...posterStrings.en, ...brandStrings.en },
  war: { ...appStrings.war, ...siteStrings.war, ...posterStrings.war, ...brandStrings.war },
  fil: { ...appStrings.fil, ...siteStrings.fil, ...posterStrings.fil, ...brandStrings.fil },
});

export type KitStrings = typeof kitStrings;

/** `kitStrings` with the app's table (from AppShell `strings`) layered on top. */
export function useKitStrings(): KitStrings {
  const app = useAppStrings();
  return useMemo(
    () => ({
      en: { ...kitStrings.en, ...app.en },
      war: { ...kitStrings.war, ...app.war },
      fil: { ...kitStrings.fil, ...app.fil },
    }),
    [app],
  );
}
