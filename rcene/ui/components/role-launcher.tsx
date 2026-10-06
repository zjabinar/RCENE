import type { MouseEvent, ReactNode } from "react";
import { ArrowRightIcon, ExternalLinkIcon } from "lucide-react";
import { Link } from "react-router";
import { useT } from "@rcene/i18n";

import { useUiStrings } from "../i18n.ts";
import { cn } from "../lib/utils.ts";
import type { AppShellWidth } from "./app-shell.tsx";
import { Button } from "./ui/button.tsx";

export interface RoleCard {
  /** Stable id; also names the role's window, so reopening it reuses that window. */
  id: string;
  /** The role's route, e.g. "/console". */
  to: string;
  /** Already translated. */
  title: string;
  summary?: ReactNode;
  /** The role's AppShell width; sets the size of its new window. Default "wide". */
  width?: AppShellWidth;
  icon?: ReactNode;
}

export interface RoleLauncherProps {
  roles: readonly RoleCard[];
  /** Prefix for window names (`<prefix>-<role id>`). Use the app slug so two apps don't share windows. */
  windowPrefix?: string;
  /** Heading level of each card title. Default 2 (under the page's h1). */
  headingLevel?: 2 | 3;
  className?: string;
}

/** Window sizes for "Open in a new window", per AppShell width (phone views are designed at 390 px). */
export const ROLE_WINDOW_SIZE: Record<AppShellWidth, { width: number; height: number }> = {
  phone: { width: 420, height: 860 },
  wide: { width: 1200, height: 860 },
  full: { width: 1440, height: 900 },
};

/**
 * Opens `to` in a separate, sized window named `name` (an existing window with that
 * name is reused). Returns false when the browser blocked the popup.
 */
export function openRoleWindow(to: string, name: string, width: AppShellWidth = "wide"): boolean {
  const size = ROLE_WINDOW_SIZE[width];
  const win = window.open(to, name, `popup,width=${size.width},height=${size.height}`);
  if (!win) return false;
  win.focus();
  return true;
}

/**
 * Cards for the roles of a multi-role app: each opens its view here, or in its own sized
 * window so a demo can show several roles side by side (they share state through
 * synced stores). "New window" is a real link: if the browser blocks the popup, it
 * still opens in a new tab.
 */
export function RoleLauncher({ roles, windowPrefix = "rcene", headingLevel = 2, className }: RoleLauncherProps) {
  const t = useT(useUiStrings());
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <ul data-slot="role-launcher" className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {roles.map((role) => {
        const name = `${windowPrefix}-${role.id}`;
        const onNewWindow = (event: MouseEvent<HTMLAnchorElement>) => {
          if (openRoleWindow(role.to, name, role.width ?? "wide")) event.preventDefault();
        };
        return (
          <li key={role.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex items-start gap-3">
              {role.icon && (
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-primary [&_svg]:size-6">
                  {role.icon}
                </span>
              )}
              <div className="min-w-0">
                <Heading className="text-lg leading-tight font-semibold">{role.title}</Heading>
                {role.summary && <p className="mt-1 text-sm text-muted-foreground">{role.summary}</p>}
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button asChild className="min-h-11">
                <Link to={role.to} aria-label={t("ui.openRole", { role: role.title })}>
                  {t("ui.open")}
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <a
                  href={role.to}
                  target={name}
                  rel="noopener"
                  onClick={onNewWindow}
                  aria-label={t("ui.openRoleWindow", { role: role.title })}
                >
                  {t("ui.newWindow")}
                  <ExternalLinkIcon aria-hidden="true" />
                </a>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
