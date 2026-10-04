import { useState, type ReactNode } from "react";
import { NavLink } from "react-router";
import { MenuIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { Button } from "@rcene/ui/components/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@rcene/ui/components/sheet";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface ConsoleNavItem {
  /** The section's route (rendered as a NavLink). Omit it for a state-driven console (see `onSelect`). */
  to?: string;
  label: string;
  /** A lucide icon element; it is decorative (give it aria-hidden="true"). */
  icon?: ReactNode;
  /** A count or a small Badge at the end of the row, e.g. the number waiting. */
  badge?: ReactNode;
  /** Match the path exactly (use for an index route). */
  end?: boolean;
  /** Instead of a route: switch the section in state. The item becomes a button; pair it with `active`. */
  onSelect?: () => void;
  /** With `onSelect`: this item is the section on screen (aria-current="page"). */
  active?: boolean;
}

export interface ConsoleLayoutProps {
  nav: ConsoleNavItem[];
  /** A right-hand panel (filters, the selected record, live feed). Right of the content at xl, below it on smaller screens. */
  aside?: ReactNode;
  /** Accessible name of the aside landmark (default "Side panel"). */
  asideLabel?: string;
  /** The console's name, shown above the nav and in the phone menu. */
  title?: string;
  children: ReactNode;
  className?: string;
}

const ITEM =
  "group relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0";
const ITEM_ACTIVE =
  "bg-primary/10 text-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary hover:bg-primary/15 [&_svg]:text-primary";

function ConsoleNavList({ nav, onNavigate }: { nav: ConsoleNavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const inner = (
          <>
            {item.icon}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && item.badge !== null && (
              <span className="ml-auto inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-semibold text-foreground tabular-nums">
                {item.badge}
              </span>
            )}
          </>
        );
        const select = item.onSelect;
        return (
          <li key={item.to ?? item.label}>
            {select ? (
              <button
                type="button"
                aria-current={item.active ? "page" : undefined}
                onClick={() => {
                  select();
                  onNavigate?.();
                }}
                className={cn(ITEM, item.active && ITEM_ACTIVE)}
              >
                {inner}
              </button>
            ) : (
              <NavLink
                to={item.to ?? "."}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => cn(ITEM, isActive && ITEM_ACTIVE)}
              >
                {inner}
              </NavLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The operator console: a sticky sidebar of sections (NavLink, aria-current)
 * at lg and up, a "Menu" button that opens the same nav in a sheet below lg,
 * the content, and an optional right panel. Put it inside
 * `<AppShell width="full">`; it brings its own padding. The sidebar sticks
 * below the shell header; set `--kit-console-top` if the header is taller.
 */
export function ConsoleLayout({ nav, aside, asideLabel, title, children, className }: ConsoleLayoutProps) {
  const t = useT(useKitStrings());
  const [open, setOpen] = useState(false);
  const navLabel = title ?? t("kit.console.nav");

  return (
    <div
      data-slot="console-layout"
      className={cn("grid min-h-0 w-full flex-1 lg:grid-cols-[15.5rem_minmax(0,1fr)]", className)}
    >
      <div data-slot="console-sidebar" className="hidden border-r bg-card/60 lg:block">
        <div className="sticky top-[var(--kit-console-top,4.5rem)] flex max-h-[calc(100svh-var(--kit-console-top,4.5rem))] flex-col gap-3 overflow-y-auto px-3 py-5">
          {title && (
            <p className="px-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</p>
          )}
          <nav aria-label={navLabel}>
            <ConsoleNavList nav={nav} />
          </nav>
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-3 border-b bg-card/60 px-4 py-2 sm:px-6 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <MenuIcon aria-hidden="true" />
                {t("kit.console.menu")}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" aria-describedby={undefined} className="w-[85vw] max-w-xs gap-0 p-0">
              <SheetHeader className="border-b">
                <SheetTitle className="font-display text-lg">{title ?? t("kit.console.menu")}</SheetTitle>
              </SheetHeader>
              <nav aria-label={navLabel} className="overflow-y-auto p-3">
                <ConsoleNavList nav={nav} onNavigate={() => setOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>
          {title && <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">{title}</p>}
        </div>

        <div
          className={cn(
            "grid min-w-0 flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8",
            aside && "xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start",
          )}
        >
          <div data-slot="console-content" className="min-w-0">
            {children}
          </div>
          {aside && (
            <aside
              aria-label={asideLabel ?? t("kit.console.aside")}
              data-slot="console-aside"
              className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-raised xl:sticky xl:top-[calc(var(--kit-console-top,4.5rem)+1.5rem)]"
            >
              {aside}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
