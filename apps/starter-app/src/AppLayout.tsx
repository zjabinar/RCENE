import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { AppShell } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { AppMark } from "@rcene/kit/brand";
import { strings } from "./i18n/strings.ts";
import { ROLES, roleForPath } from "./roles.ts";

/**
 * One shell for every view. Its width and palette follow the role of the current route
 * (src/roles.ts): the console fills the screen, the resident view is phone-sized and the
 * board is full-screen in the high-contrast malinaw palette.
 */
export function AppLayout() {
  const t = useT(strings);
  const { pathname } = useLocation();
  const role = roleForPath(pathname);
  return (
    <AppShell
      title={t("app.title")}
      tagline={t("app.tagline")}
      brand={<AppMark size={32} />}
      width={role?.width ?? "wide"}
      palette={role?.palette}
      themeMenu={!role?.palette}
      showReset
      nav={[
        { to: "/", label: t("nav.home"), end: true },
        ...ROLES.map((r) => ({ to: r.path, label: t(`role.${r.id}.title`) })),
        { to: "/sources", label: t("app.sources") },
      ]}
      // The only layer this app reads (the barangay names in the New request form).
      layers={["barangays"]}
      strings={strings}
    >
      <Outlet />
      {/* New page, top of the page (and Back returns to where you were). */}
      <ScrollRestoration />
    </AppShell>
  );
}
