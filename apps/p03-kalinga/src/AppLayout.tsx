import { Outlet, useLocation } from "react-router";
import { AppShell } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { strings } from "./i18n/strings.ts";
import { ROLES, roleForPath } from "./roles.ts";

/**
 * One shell for every role: the width follows the role of the current route (phone,
 * wide or full). Pass layers={[…]} once the views use real layers, so the "Sample data"
 * badge only checks those.
 */
export function AppLayout() {
  const t = useT(strings);
  const { pathname } = useLocation();
  const role = roleForPath(pathname);
  return (
    <AppShell
      title={t("app.title")}
      tagline={t("app.tagline")}
      width={role?.width ?? "wide"}
      showReset
      nav={[
        { to: "/", label: t("nav.start"), end: true },
        ...ROLES.map((r) => ({ to: r.path, label: t(`role.${r.id}.title`) })),
        { to: "/sources", label: t("app.sources") },
      ]}
      strings={strings}
    >
      <Outlet />
    </AppShell>
  );
}
