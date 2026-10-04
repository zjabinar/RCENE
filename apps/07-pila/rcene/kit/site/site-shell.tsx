import { useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { MenuIcon } from "lucide-react";
import { StringsProvider, useAppStrings, useT, type AppStrings } from "@rcene/i18n";
import { LangToggle, SkipLink, ThemeMenu } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@rcene/ui/components/sheet";
import { cn } from "@rcene/ui/lib/utils";
import { SmoothScroll } from "@rcene/ui/motion";
import { useThemeSync } from "@rcene/ui/theme";

import { useKitStrings } from "../i18n.ts";
import { SiteFooter } from "./site-footer.tsx";
import { SITE_CONTAINER, isRoute } from "./site-link.tsx";

export interface SiteNavItem {
  /** "/route" (router, gets aria-current="page" when active) or "#section" (in-page anchor). */
  to: string;
  label: string;
  /** Match the path exactly; automatic for "/". */
  end?: boolean;
}

export interface SiteShellProps {
  /** A mark before the title, e.g. <AppMark /> from @rcene/kit/brand. */
  brand?: ReactNode;
  /** The site name in the top bar (links home) and, by default, the document title. */
  title: string;
  nav?: SiteNavItem[];
  /** Extra controls before the theme and language menus (e.g. an "Open the app" button). */
  actions?: ReactNode;
  /** Replaces the default footer (a SiteFooter with the brand and the disclaimer). Pass null for none. */
  footer?: ReactNode;
  /** Lenis smooth scrolling for story pages. Native scrolling under reduced motion. */
  smooth?: boolean;
  /** Set document.title to `title` (default true). False for a shell embedded in another page, e.g. a preview. */
  documentTitle?: boolean;
  /**
   * A shell shown inside another page (a gallery preview): no skip link, its content
   * in a <div> instead of a second <main id="main">, and document.title left alone.
   */
  embedded?: boolean;
  /** The app's string table, provided to everything inside (like AppShell `strings`). */
  strings?: AppStrings;
  className?: string;
  children: ReactNode;
}

/** Height of the top bar; sticky panels inside the page (ScrollyChapter) sit below it. */
const HEADER_HEIGHT = "4rem";

const linkBase =
  "relative inline-flex h-9 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground";
const linkActive =
  "text-foreground after:absolute after:inset-x-3 after:-bottom-[0.6875rem] after:h-0.5 after:rounded-full after:bg-primary";
const sheetLinkBase =
  "relative flex h-11 items-center rounded-lg px-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const sheetLinkActive =
  "bg-accent text-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-primary";

/** One nav link. Extra props (from SheetClose asChild: onClick, ref) go to the <a>. */
function NavItemLink({
  item,
  sheet = false,
  ...rest
}: { item: SiteNavItem; sheet?: boolean } & Omit<ComponentProps<"a">, "href" | "className" | "children">) {
  const base = sheet ? sheetLinkBase : linkBase;
  if (!isRoute(item.to)) {
    return (
      <a {...rest} href={item.to} className={base}>
        {item.label}
      </a>
    );
  }
  return (
    <NavLink
      {...rest}
      to={item.to}
      end={item.end ?? item.to === "/"}
      className={({ isActive }) => cn(base, isActive && (sheet ? sheetLinkActive : linkActive))}
    >
      {item.label}
    </NavLink>
  );
}

/**
 * Website layout (landing and story pages, not the app chrome): skip link,
 * a sticky top bar that turns from transparent to solid once the page
 * scrolls (brand + title, nav with aria-current, actions, theme and
 * language menus, a menu sheet on phones), <main id="main">, then the footer.
 * Keeps <html> on the effective theme, like AppShell. Needs a router.
 */
export function SiteShell({
  brand,
  title,
  nav,
  actions,
  footer,
  smooth = false,
  documentTitle = true,
  embedded = false,
  strings,
  className,
  children,
}: SiteShellProps) {
  useThemeSync();
  const inherited = useAppStrings();
  const table = strings ?? inherited;

  useEffect(() => {
    if (documentTitle && !embedded) document.title = title;
  }, [title, documentTitle, embedded]);

  const page = (
    <StringsProvider value={table}>
      <SiteFrame brand={brand} title={title} nav={nav} actions={actions} footer={footer} embedded={embedded} className={className}>
        {children}
      </SiteFrame>
    </StringsProvider>
  );
  return smooth ? <SmoothScroll>{page}</SmoothScroll> : page;
}

function SiteFrame({ brand, title, nav, actions, footer, embedded, className, children }: Omit<SiteShellProps, "smooth" | "strings" | "documentTitle">) {
  const t = useT(useKitStrings());
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const hasNav = Boolean(nav && nav.length > 0);

  // Solid once the top of the page has scrolled away.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!(entry?.isIntersecting ?? true)));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      data-slot="site-shell"
      style={{ "--kit-sticky-top": HEADER_HEIGHT } as CSSProperties}
      className={cn("relative flex min-h-svh flex-col bg-background text-foreground", className)}
    >
      <div ref={sentinel} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-2" />
      {!embedded && <SkipLink label={t("app.skipToContent")} />}

      <header
        data-slot="site-header"
        data-scrolled={scrolled}
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ease-weave",
          scrolled
            ? "border-border bg-background/90 shadow-raised backdrop-blur-md supports-[backdrop-filter]:bg-background/75"
            : "border-transparent bg-transparent",
        )}
      >
        <div className={cn(SITE_CONTAINER, "flex h-16 items-center gap-2 sm:gap-3")}>
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 rounded-md font-display text-lg leading-tight font-semibold tracking-tight text-foreground hover:text-primary"
          >
            {brand && <span className="flex shrink-0 items-center">{brand}</span>}
            <span className="truncate">{title}</span>
          </Link>

          {hasNav && (
            <nav aria-label={t("kit.site.mainNav")} className="ml-4 hidden md:block lg:ml-8">
              <ul role="list" className="flex items-center gap-1">
                {nav!.map((item) => (
                  <li key={item.to}>
                    <NavItemLink item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions && <div className="hidden items-center gap-2 md:flex">{actions}</div>}
            <ThemeMenu className="hidden sm:inline-flex" />
            <LangToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("kit.site.openMenu")}>
                  <MenuIcon aria-hidden="true" className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" aria-describedby={undefined} className="w-[85vw] gap-0 p-0 sm:max-w-sm">
                <SheetHeader className="border-b p-5 pr-12">
                  <SheetTitle className="flex items-center gap-2.5 font-display text-lg font-semibold">
                    {brand && <span className="flex shrink-0 items-center">{brand}</span>}
                    {title}
                  </SheetTitle>
                </SheetHeader>
                {hasNav && (
                  <nav aria-label={t("kit.site.mainNav")} className="p-3">
                    <ul role="list" className="flex flex-col gap-1">
                      {nav!.map((item) => (
                        <li key={item.to}>
                          <SheetClose asChild>
                            <NavItemLink item={item} sheet />
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                {actions && <div className="flex flex-col items-stretch gap-2 border-t p-5">{actions}</div>}
                <div className="mt-auto border-t p-5">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">{t("kit.site.settings")}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ThemeMenu />
                    <LangToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {embedded ? (
        <div className="flex-1">{children}</div>
      ) : (
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      )}

      {footer === undefined ? (
        <SiteFooter
          brand={
            <>
              {brand}
              <span>{title}</span>
            </>
          }
        />
      ) : (
        footer
      )}
    </div>
  );
}
