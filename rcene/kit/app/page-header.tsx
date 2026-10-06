import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRightIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface Breadcrumb {
  label: string;
  /** A route to link to. The last crumb (the current page) usually has none. */
  to?: string;
}

export interface PageHeaderProps {
  /** The page title (the page's only h1). */
  title: string;
  description?: ReactNode;
  /** A short kicker above the title, e.g. the section or the role. */
  eyebrow?: ReactNode;
  /** Buttons or links; they sit right of the title on wide screens and wrap under it on phones. */
  actions?: ReactNode;
  /** Trail to this page. The last item is marked as the current page. */
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

/**
 * The top of a page: breadcrumbs, eyebrow, an h1 in the palette's display
 * face, a description and actions. Use one per route.
 */
export function PageHeader({ title, description, eyebrow, actions, breadcrumbs, className }: PageHeaderProps) {
  const t = useT(useKitStrings());
  return (
    <header data-slot="page-header" className={cn("flex flex-col gap-4 pb-6 sm:pb-8", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label={t("kit.pageHeader.breadcrumbs")}>
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
                  {crumb.to && !last ? (
                    <Link
                      to={crumb.to}
                      className="rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={cn("truncate", last && "font-medium text-foreground")}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {!last && <ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0 opacity-60" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow && (
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              <span aria-hidden="true" className="h-0.5 w-6 rounded-full bg-primary" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-display-3 font-semibold tracking-tight text-balance">{title}</h1>
          {description && <div className="max-w-prose text-base text-pretty text-muted-foreground">{description}</div>}
        </div>
        {actions && (
          <div data-slot="page-header-actions" className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
