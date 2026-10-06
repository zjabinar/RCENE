import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { CapacityMeter, IllustratedState, PageHeader, QrDisplay } from "@rcene/kit/app";
import { toast } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Separator } from "@rcene/ui/components/separator";
import { crewLoad, isOverdue } from "@/domain/kpis.ts";
import { findRecord, nextStatus, type RequestRecord } from "@/domain/records.ts";
import { demoNow } from "@/domain/time.ts";
import { ConsoleFrame } from "@/features/console/ConsoleFrame.tsx";
import { CategoryLabel, OverdueBadge, PriorityBadge, StatusBadge } from "@/features/requests/badges.tsx";
import { RequestTimeline } from "@/features/requests/RequestTimeline.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

/** /console/:id: one request, its timeline and details, its crew's load and a QR to track it. */
export function RecordDetail() {
  const t = useT(strings);
  const { id = "" } = useParams();
  const record = useRecords((s) => findRecord(s.records, id));

  if (!record) {
    return (
      <ConsoleFrame>
        <PageHeader
          title={t("detail.notFound", { code: id })}
          breadcrumbs={[{ label: t("console.title"), to: "/console" }, { label: id }]}
        />
        <IllustratedState
          spot="search"
          title={t("detail.notFound", { code: id })}
          description={t("detail.notFoundLead")}
          actions={
            <Button asChild variant="outline">
              <Link to="/console">
                <ArrowLeftIcon aria-hidden="true" />
                {t("detail.back")}
              </Link>
            </Button>
          }
        />
      </ConsoleFrame>
    );
  }
  // "/console/rec-1" finds REC-0001: show it under its canonical address.
  if (record.code !== id) return <Navigate to={`/console/${record.code}`} replace />;

  return <RecordView record={record} />;
}

function RecordView({ record }: { record: RequestRecord }) {
  const t = useT(strings);
  const fmt = useFormat();
  const advance = useRecords((s) => s.advance);
  const records = useRecords((s) => s.records);
  const now = demoNow();
  const next = nextStatus(record.status);
  const category = t(`category.${record.category}`);
  const load = crewLoad(records, record.category);
  // An absolute URL, so a phone camera can open it (on the demo laptop's address).
  const trackUrl = new URL(`/resident?code=${record.code}`, window.location.origin).href;

  const onAdvance = () => {
    if (!next) return;
    advance(record.code, demoNow());
    toast.success(t("detail.advanced", { code: record.code, status: t(`record.status.${next}`) }));
  };

  const details: [string, ReactNode][] = [
    [t("col.category"), <CategoryLabel category={record.category} />],
    [t("col.barangay"), record.barangay],
    [t("col.priority"), <PriorityBadge urgent={record.priority === "urgent"} />],
    [t("col.channel"), t(`channel.${record.channel}`)],
    [t("col.households"), fmt.number(record.households)],
    [t("col.landmark"), record.landmark || <span className="text-muted-foreground">{t("new.notGiven")}</span>],
    [t("col.received"), `${fmt.date(new Date(record.receivedAt))} · ${fmt.time(new Date(record.receivedAt))}`],
    [t("col.due"), fmt.date(new Date(record.dueAt))],
  ];

  return (
    <ConsoleFrame
      asideLabel={t("detail.aside")}
      aside={
        <>
          <section aria-labelledby="crew-heading" className="flex flex-col gap-3">
            <h2 id="crew-heading" className="font-display text-lg font-semibold">
              {t("detail.crewTitle")}
            </h2>
            <CapacityMeter label={t("detail.crew", { category })} value={load.used} max={load.slots} />
            <p className="text-sm text-muted-foreground">{t("detail.crewHint")}</p>
          </section>
          <Separator />
          <QrDisplay
            value={trackUrl}
            label={t("detail.qr", { code: record.code })}
            hint={t("detail.qrHint")}
            size={168}
            download={`track-${record.code}`}
            className="self-center border-0 bg-transparent p-0 shadow-none"
          />
        </>
      }
    >
      <PageHeader
        eyebrow={category}
        title={record.code}
        breadcrumbs={[
          { label: t("console.title"), to: "/console" },
          { label: t("console.nav.records"), to: "/console/records" },
          { label: record.code },
        ]}
        description={
          <div className="flex flex-col gap-3">
            <p>{t("detail.lead", { category, barangay: record.barangay, date: fmt.date(new Date(record.receivedAt)) })}</p>
            <p className="flex flex-wrap items-center gap-2">
              <StatusBadge status={record.status} />
              {record.priority === "urgent" && <PriorityBadge urgent />}
              {isOverdue(record, now) && <OverdueBadge />}
            </p>
          </div>
        }
        actions={
          next ? (
            <Button size="lg" onClick={onAdvance}>
              {t("detail.advance", { status: t(`record.status.${next}`) })}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <CircleCheckIcon aria-hidden="true" className="size-5" />
              {t("detail.completed")}
            </p>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <section aria-labelledby="progress-heading" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="progress-heading" className="mb-5 font-display text-lg font-semibold">
            {t("detail.progress")}
          </h2>
          <RequestTimeline record={record} />
        </section>

        <section aria-labelledby="details-heading" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="details-heading" className="mb-5 font-display text-lg font-semibold">
            {t("detail.details")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {details.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </ConsoleFrame>
  );
}
