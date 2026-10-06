import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { AppShell } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { AppMark } from "@rcene/kit/brand";
import { PresenterMode } from "@rcene/kit/poster";
import { useDemoSteps } from "./features/demo/demo-steps.ts";
import { strings } from "./i18n/strings.ts";
import { ROLES, roleForPath } from "./roles.ts";

/**
 * One shell for every role: the width follows the role of the current route (phone,
 * wide or full). Pass layers={[…]} once the views use real layers, so the "Sample data"
 * badge only checks those. The presenter bar (the demo steps) shows when the app is
 * opened with ?present, or after pressing P.
 */
export function AppLayout() {
  const t = useT(strings);
  const { pathname, search } = useLocation();
  const role = roleForPath(pathname);
  const steps = useDemoSteps();
  const [presenting, setPresenting] = useState(() => new URLSearchParams(search).has("present"));
  return (
    <AppShell
      title={t("app.title")}
      tagline={t("app.tagline")}
      width={role?.width ?? "wide"}
      brand={<AppMark size={32} />}
      showReset
      nav={[
        { to: "/", label: t("nav.start"), end: true },
        ...ROLES.map((r) => ({ to: r.path, label: t(`role.${r.id}.title`) })),
        { to: "/sources", label: t("app.sources") },
      ]}
      strings={strings}
    >
      <Outlet />
      <PresenterMode steps={steps} open={presenting} onOpenChange={setPresenting} />
    </AppShell>
  );
}
