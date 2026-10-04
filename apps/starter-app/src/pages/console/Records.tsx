import { Link } from "react-router";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import { isOverdue } from "@/domain/kpis.ts";
import { STATUSES, newestFirst, type RequestRecord, type Status } from "@/domain/records.ts";
import { demoNow } from "@/domain/time.ts";
import { ConsoleFrame } from "@/features/console/ConsoleFrame.tsx";
import { CategoryLabel, OverdueBadge, PriorityBadge, StatusBadge } from "@/features/requests/badges.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

/** Finished requests pile up; the Done column shows the latest few and counts the rest. */
const DONE_SHOWN = 4;

/** /console/records: one column per step, a card per request, oldest work first. */
export function ConsoleRecords() {
  const t = useT(strings);
  const records = useRecords((s) => s.records);
  const now = demoNow();

  return (
    <ConsoleFrame>
      <PageHeader
        eyebrow={t("console.title")}
        title={t("records.title")}
        description={t("records.lead")}
        breadcrumbs={[{ label: t("console.title"), to: "/console" }, { label: t("console.nav.records") }]}
        actions={
          <Button asChild variant="outline">
            <Link to="/console/new">
              <PlusIcon aria-hidden="true" />
              {t("overview.new")}
            </Link>
          </Button>
        }
      />
      <ol aria-label={t("records.steps")} className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {STATUSES.map((status) => (
          <StatusColumn key={status} status={status} records={records.filter((r) => r.status === status)} now={now} />
        ))}
      </ol>
    </ConsoleFrame>
  );
}

function StatusColumn({ status, records, now }: { status: Status; records: RequestRecord[]; now: string }) {
  const t = useT(strings);
  const fmt = useFormat();
  // Open work: oldest first (it has waited longest). Done: newest first.
  const sorted = status === "done" ? newestFirst(records) : newestFirst(records).reverse();
  const shown = status === "done" ? sorted.slice(0, DONE_SHOWN) : sorted;

  return (
    <li className="flex min-w-0 flex-col rounded-xl border bg-muted/40">
      <h2 className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <StatusBadge status={status} />
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">{fmt.number(records.length)}</span>
      </h2>
      {shown.length === 0 ? (
        <p className="m-2 rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{t("records.none")}</p>
      ) : (
        <ul className="flex flex-col gap-2 p-2">
          {shown.map((record) => (
            <li key={record.code}>
              <RecordCard record={record} overdue={isOverdue(record, now)} />
            </li>
          ))}
        </ul>
      )}
      {sorted.length > shown.length && (
        <p className="px-4 pb-3 text-sm text-muted-foreground">{t("records.more", { n: fmt.number(sorted.length - shown.length) })}</p>
      )}
    </li>
  );
}

function RecordCard({ record, overdue }: { record: RequestRecord; overdue: boolean }) {
  const t = useT(strings);
  const fmt = useFormat();
  return (
    <Link
      to={`/console/${record.code}`}
      className="group flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-raised transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold tabular-nums">{record.code}</span>
        <ChevronRightIcon aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <CategoryLabel category={record.category} />
        <span aria-hidden="true" className="text-muted-foreground">
          ·
        </span>
        <span className="text-muted-foreground">{record.barangay}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{t("records.due", { date: fmt.date(new Date(record.dueAt)) })}</span>
        {overdue && <OverdueBadge />}
        {record.priority === "urgent" && <PriorityBadge urgent />}
      </span>
    </Link>
  );
}
