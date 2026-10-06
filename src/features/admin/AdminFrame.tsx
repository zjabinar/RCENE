import type { ReactNode } from "react";
import { DatabaseIcon, FileImageIcon, FlaskConicalIcon, LayoutGridIcon, PaletteIcon, PresentationIcon, SparklesIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { ConsoleLayout } from "@rcene/kit/app";
import { strings } from "@/i18n/strings.ts";

/** The admin console around every /admin page: settings, the AI lab, demo data, and shortcuts to the demo and the poster. */
export function AdminFrame({ children, aside, asideLabel }: { children: ReactNode; aside?: ReactNode; asideLabel?: string }) {
  const t = useT(strings);
  return (
    <ConsoleLayout
      title={t("admin.title")}
      aside={aside}
      asideLabel={asideLabel}
      nav={[
        { to: "/admin", end: true, label: t("admin.nav.overview"), icon: <LayoutGridIcon aria-hidden="true" /> },
        { to: "/admin/ai", label: t("admin.nav.ai"), icon: <SparklesIcon aria-hidden="true" /> },
        { to: "/admin/lab", label: t("admin.nav.lab"), icon: <FlaskConicalIcon aria-hidden="true" /> },
        { to: "/admin/appearance", label: t("admin.nav.appearance"), icon: <PaletteIcon aria-hidden="true" /> },
        { to: "/admin/data", label: t("admin.nav.data"), icon: <DatabaseIcon aria-hidden="true" /> },
        { to: "/demo", label: t("admin.nav.demo"), icon: <PresentationIcon aria-hidden="true" /> },
        { to: "/poster", label: t("admin.nav.poster"), icon: <FileImageIcon aria-hidden="true" /> },
      ]}
    >
      {children}
    </ConsoleLayout>
  );
}
