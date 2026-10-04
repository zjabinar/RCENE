import type { ReactNode } from "react";
import { FilePlusIcon, LayoutDashboardIcon, SquareKanbanIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { ConsoleLayout } from "@rcene/kit/app";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

interface ConsoleFrameProps {
  children: ReactNode;
  /** A right-hand panel for this page (right of the content from xl, under it below). */
  aside?: ReactNode;
  asideLabel?: string;
}

/**
 * The office console around every /console page: the side nav (a sheet on phones)
 * with the number of open requests on "Records". Each page wraps itself in it, so a
 * page can add its own `aside`.
 */
export function ConsoleFrame({ children, aside, asideLabel }: ConsoleFrameProps) {
  const t = useT(strings);
  const fmt = useFormat();
  const open = useRecords((s) => s.records.filter((r) => r.status !== "done").length);

  return (
    <ConsoleLayout
      title={t("console.title")}
      aside={aside}
      asideLabel={asideLabel}
      nav={[
        { to: "/console", end: true, label: t("console.nav.overview"), icon: <LayoutDashboardIcon aria-hidden="true" /> },
        { to: "/console/new", label: t("console.nav.new"), icon: <FilePlusIcon aria-hidden="true" /> },
        {
          to: "/console/records",
          label: t("console.nav.records"),
          icon: <SquareKanbanIcon aria-hidden="true" />,
          badge: (
            <>
              <span aria-hidden="true">{fmt.number(open)}</span>
              <span className="sr-only">{t("console.nav.openCount", { n: fmt.number(open) })}</span>
            </>
          ),
        },
      ]}
    >
      {children}
    </ConsoleLayout>
  );
}
