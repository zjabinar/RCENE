/**
 * Strings used only inside @rcene/ui that `common` does not have yet.
 * Candidates to move into @rcene/i18n's `common` in the next package window.
 * Waray "ui.close" is intentionally absent (falls back to English) until a
 * fluent speaker supplies it; "ui.home" reuses the template's reviewed-for-now
 * "nav.home" wording.
 */
import { common, extendStrings } from "@rcene/i18n";

export const uiStrings = extendStrings(common, {
  en: {
    "ui.close": "Close",
    "ui.home": "Home",
  },
  war: {
    "ui.home": "Puno",
  },
  fil: {
    "ui.close": "Isara",
    "ui.home": "Home",
  },
});
