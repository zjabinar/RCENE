import { Outlet } from "react-router";
import { AppShell } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { strings } from "./i18n/strings.ts";

export function AppLayout() {
  const t = useT(strings);
  return (
    <AppShell
      title={t("app.title")}
      tagline={t("app.tagline")}
      nav={[
        { to: "/", label: t("nav.home"), end: true },
        { to: "/sources", label: t("app.sources") },
      ]}
      layers={["boundary", "barangays", "hazard-flood"]}
    >
      <Outlet />
    </AppShell>
  );
}
