import { useEffect, useMemo, type MouseEvent, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { RotateCcwIcon } from "lucide-react";
import type { LayerName } from "@rcene/data";
import { StringsProvider, useAppStrings, useT, type AppStrings } from "@rcene/i18n";
import { resetDemo } from "@rcene/store";

import { cn } from "../lib/utils.ts";
import { Button } from "./ui/button.tsx";
import { Toaster } from "./ui/sonner.tsx";
import { DisclaimerFooter } from "./disclaimer-footer.tsx";
import { LangToggle } from "./lang-toggle.tsx";
import { SampleDataBadge } from "./sample-data-badge.tsx";

export interface NavItem {
  to: string;
  label: string;
  /** Match the path exactly (use for "/"). */
  end?: boolean;
}

export type AppShellWidth = "phone" | "wide" | "full";

export interface AppShellProps {
  title: string;
  tagline?: string;
  nav?: NavItem[];
  /** Extra header controls, placed before the language picker. */
  actions?: ReactNode;
  /** Layers this app uses; drives the "Sample data" badge. Omit to check every file. */
  layers?: readonly LayerName[];
  /** phone = max-w-md (resident views, designed at 390px); wide (default) = max-w-7xl; full = full-bleed, no padding. */
  width?: AppShellWidth;
  /** Show a "Reset demo" button that clears every persisted store except the language. */
  showReset?: boolean;
  /**
   * The app's string table (`extendStrings(common, …)`). Everything inside the
   * shell (footer, /sources, state views, map legend…) then shows the app's
   * overrides of `common` keys, e.g. its own "app.disclaimer".
   */
  strings?: AppStrings;
  /** Disclaimer text (already translated) for the footer and /sources. Wins over `strings`. */
  disclaimer?: string;
  /** Mount the shared, themed sonner <Toaster/> once (default true). Then call `toast("…")` from `@rcene/ui`. */
  toaster?: boolean;
  children: ReactNode;
}

const FRAME: Record<AppShellWidth, string> = {
  phone: "max-w-md px-4",
  wide: "max-w-7xl px-4 sm:px-6",
  full: "max-w-none px-4 sm:px-6",
};

const MAIN: Record<AppShellWidth, string> = {
  phone: "mx-auto w-full max-w-md px-4 py-4",
  wide: "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6",
  full: "flex min-h-0 w-full flex-col",
};

/**
 * Moves focus to <main> without changing the URL hash (which the router would
 * see as a navigation). <main> starts right under the sticky header, so
 * scrolling to the top shows its start instead of hiding it under the header.
 */
function skipToMain(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById("main");
  if (!main) return;
  event.preventDefault();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

/** `strings` with one key replaced in every language (an explicit, already-translated override). */
function withString(strings: AppStrings, key: keyof AppStrings["en"] & string, text: string): AppStrings {
  return {
    en: { ...strings.en, [key]: text },
    war: { ...strings.war, [key]: text },
    fil: { ...strings.fil, [key]: text },
  };
}

/**
 * App chrome: skip link, sticky header (title, tagline, sample-data badge,
 * actions, reset, language), optional nav row, <main id="main">, the
 * disclaimer footer and the toast region. Provides `strings` to every shared
 * component inside it.
 */
export function AppShell({
  title,
  tagline,
  nav,
  actions,
  layers,
  width = "wide",
  showReset = false,
  strings,
  disclaimer,
  toaster = true,
  children,
}: AppShellProps) {
  const inherited = useAppStrings();
  const base = strings ?? inherited;
  const table = useMemo(
    () => (disclaimer === undefined ? base : withString(base, "app.disclaimer", disclaimer)),
    [base, disclaimer],
  );
  const t = useT(table);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <StringsProvider value={table}>
      <div data-slot="app-shell" data-width={width} className="flex min-h-svh flex-col bg-background text-foreground">
        <a
          href="#main"
          onClick={skipToMain}
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
        >
          {t("app.skipToContent")}
        </a>

        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className={cn("mx-auto flex w-full flex-wrap items-center gap-x-3 gap-y-2 py-2", FRAME[width])}>
            <div className="min-w-0 flex-1 basis-40">
              <Link
                to="/"
                className="block truncate rounded-sm text-base leading-tight font-semibold tracking-tight hover:text-primary sm:text-lg"
              >
                {title}
              </Link>
              {tagline && <p className="truncate text-xs text-muted-foreground sm:text-sm">{tagline}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <SampleDataBadge layers={layers} />
              {actions}
              {showReset && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title={t("app.resetDemo")}
                  onClick={() => resetDemo({ keep: ["lang"] })}
                >
                  <RotateCcwIcon aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">{t("app.resetDemo")}</span>
                </Button>
              )}
              <LangToggle />
            </div>
          </div>
          {nav && nav.length > 0 && (
            <nav className={cn("mx-auto w-full", FRAME[width])}>
              <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pt-1 pb-2">
                {nav.map((item) => (
                  <li key={item.to} className="shrink-0">
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent text-foreground shadow-[inset_0_-2px_0_var(--primary)]",
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>

        <main id="main" tabIndex={-1} className={cn("flex-1 focus:outline-none", MAIN[width])}>
          {children}
        </main>

        <DisclaimerFooter className={FRAME[width]} />
        {toaster && <Toaster />}
      </div>
    </StringsProvider>
  );
}
