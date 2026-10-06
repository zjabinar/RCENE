import { useParams, useSearchParams } from "react-router";
import { LANGS, LangOverride, useT, type Lang } from "@rcene/i18n";
import { IllustratedState } from "@rcene/kit/app";
import { ErrorBoundary, Toaster } from "@rcene/ui";
import { isModeSetting, isPalette, useThemeOverride, useThemeSync, type Mode } from "@rcene/ui/theme";
import { strings } from "../i18n/strings.ts";
import { findEntry, isFamily } from "../gallery/registry.ts";

function isLang(value: string | undefined): value is Lang {
  return (LANGS as readonly string[]).includes(value ?? "");
}

/**
 * "/frame/<family>/<slug>?palette=&mode=&lang=": one example alone, for the
 * 390 px preview iframe. No AppShell: the example is the whole page.
 */
export function Frame() {
  const t = useT(strings);
  const { family, slug } = useParams();
  const [params] = useSearchParams();
  const palette = params.get("palette") ?? undefined;
  const mode = params.get("mode") ?? undefined;
  const lang = params.get("lang") ?? undefined;
  const override = {
    ...(isPalette(palette) ? { palette } : {}),
    ...(isModeSetting(mode) && mode !== "system" ? { mode: mode as Mode } : {}),
  };
  useThemeSync();
  useThemeOverride(Object.keys(override).length > 0 ? override : null);

  const entry = isFamily(family) ? findEntry(family, slug) : undefined;
  const body = entry ? (
    <ErrorBoundary>
      <entry.Example />
    </ErrorBoundary>
  ) : (
    <IllustratedState spot="search" title={t("preview.notFound", { name: slug ?? "" })} />
  );
  return (
    <main id="main" className="min-h-dvh bg-background p-4 text-foreground">
      {isLang(lang) ? <LangOverride lang={lang}>{body}</LangOverride> : body}
      <Toaster />
    </main>
  );
}
