import { Outlet } from "react-router";
import { AppShell } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { AppMark } from "@rcene/kit/brand";
import { strings } from "./i18n/strings.ts";

export function AppLayout() {
  const t = useT(strings);
  return (
    <AppShell
      title={t("app.title")}
      tagline={t("app.tagline")}
      brand={<AppMark size={32} />}
      nav={[
        { to: "/", label: t("nav.overview"), end: true },
        { to: "/foundations", label: t("nav.foundations") },
        { to: "/themes", label: t("nav.themes") },
        { to: "/app", label: t("nav.app") },
        { to: "/site", label: t("nav.site") },
        { to: "/poster", label: t("nav.poster") },
        { to: "/brand", label: t("nav.brand") },
        { to: "/sources", label: t("app.sources") },
      ]}
      strings={strings}
    >
      <Outlet />
    </AppShell>
  );
}
