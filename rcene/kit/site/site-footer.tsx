import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { useLenis } from "lenis/react";
import { ArrowUpIcon, InfoIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import { useReducedMotion } from "@rcene/ui/motion";

import { useKitStrings } from "../i18n.ts";
import { SITE_CONTAINER, SiteLink } from "./site-link.tsx";

export interface SiteFooterLink {
  /** "/route", "#section" or a URL. */
  to: string;
  label: string;
}

export interface SiteFooterColumn {
  title: string;
  links: SiteFooterLink[];
}

export interface SiteFooterProps {
  /** The mark and name, e.g. <><AppMark /> Andam</>. */
  brand?: ReactNode;
  /** Link columns (up to four read best). */
  columns?: SiteFooterColumn[];
  /** A line under the brand: what the site is, who made it, the event. */
  note?: ReactNode;
  className?: string;
}

const COLUMNS = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"] as const;

function ColumnNav({ column }: { column: SiteFooterColumn }) {
  const id = useId();
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="font-sans text-sm font-semibold tracking-wide text-foreground">
        {column.title}
      </h2>
      <ul role="list" className="mt-4 flex flex-col gap-2.5">
        {column.links.map((link) => (
          <li key={`${link.to}-${link.label}`}>
            <SiteLink
              to={link.to}
              className="rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {link.label}
            </SiteLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The site's footer: a woven edge, the brand and a note, link columns, then
 * the preparedness disclaimer (the app's `app.disclaimer`), the link to
 * /sources and "Back to top". Needs a router (the sources link).
 */
export function SiteFooter({ brand, columns, note, className }: SiteFooterProps) {
  const t = useT(useKitStrings());
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const count = Math.min(columns?.length ?? 0, 4);

  const backToTop = () => {
    if (lenis && !reduced) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    document.getElementById("main")?.focus({ preventScroll: true });
  };

  return (
    <footer data-slot="site-footer" className={cn("border-t bg-muted/40", className)}>
      <div aria-hidden="true" className="weave-band" />
      {(brand || note || count > 0) && (
        <div className={cn(SITE_CONTAINER, "grid gap-10 lg:grid-cols-12 lg:gap-12", count > 0 ? "py-12 sm:py-16" : "py-8")}>
          {(brand || note) && (
            <div className="flex flex-col gap-4 lg:col-span-4">
              {brand && (
                <div className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-foreground">{brand}</div>
              )}
              {note && <div className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">{note}</div>}
            </div>
          )}
          {count > 0 && (
            <div className={cn("grid grid-cols-2 gap-8", COLUMNS[count], brand || note ? "lg:col-span-8" : "lg:col-span-12")}>
              {columns!.map((column) => (
                <ColumnNav key={column.title} column={column} />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="border-t">
        <div
          className={cn(
            SITE_CONTAINER,
            "flex flex-col gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6",
          )}
        >
          <p className="flex items-start gap-1.5">
            <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>{t("app.disclaimer")}</span>
          </p>
          <div className="flex shrink-0 items-center gap-5">
            <Link to="/sources" className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:text-primary">
              {t("app.sources")}
            </Link>
            <button
              type="button"
              onClick={backToTop}
              className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground hover:text-primary"
            >
              <ArrowUpIcon aria-hidden="true" className="size-3.5" />
              {t("kit.site.backToTop")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
