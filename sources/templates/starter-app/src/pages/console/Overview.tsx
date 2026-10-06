import { Link } from "react-router";
import { PlusIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { KpiRow, PageHeader } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import { computeKpis } from "@/domain/kpis.ts";
import { demoNow } from "@/domain/time.ts";
import { ConsoleFrame } from "@/features/console/ConsoleFrame.tsx";
import { CategoryChart, StatusChart } from "@/features/requests/RequestCharts.tsx";
import { RequestsTable } from "@/features/requests/RequestsTable.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

/** /console: the week in four numbers, two charts, then every request. */
export function ConsoleOverview() {
  const t = useT(strings);
  const fmt = useFormat();
  const records = useRecords((s) => s.records);
  const now = demoNow();
  const kpis = computeKpis(records, now);

  return (
    <ConsoleFrame>
      <PageHeader
        eyebrow={t("console.title")}
        title={t("overview.title")}
        description={t("overview.lead")}
        actions={
          <Button asChild size="lg">
            <Link to="/console/new">
              <PlusIcon aria-hidden="true" />
              {t("overview.new")}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <KpiRow
          label={t("kpi.label")}
          items={[
            { id: "open", label: t("kpi.open"), value: kpis.open, countUp: true, hint: t("kpi.openHint", { n: fmt.number(records.length) }) },
            {
              id: "due",
              label: t("kpi.due"),
              value: kpis.dueThisWeek,
              countUp: true,
              tone: kpis.overdue > 0 ? "warning" : "default",
              hint: kpis.overdue > 0 ? t("kpi.overdue", { n: fmt.number(kpis.overdue) }) : t("kpi.noneOverdue"),
            },
            { id: "done", label: t("kpi.done"), value: kpis.done, countUp: true, hint: t("kpi.doneHint", { n: fmt.number(kpis.doneThisWeek) }) },
            {
              id: "average",
              label: t("kpi.average"),
              value: kpis.averageDays ?? t("kpi.notYet"),
              format: (n) => fmt.number(n, 1),
              hint: t("kpi.averageHint"),
            },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <StatusChart records={records} />
          <CategoryChart records={records} />
        </div>

        <RequestsTable records={records} now={now} />
      </div>
    </ConsoleFrame>
  );
}
