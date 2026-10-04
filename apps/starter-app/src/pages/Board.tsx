import type { ReactNode } from "react";
import { BellRingIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { BoardRotator, BoardShell, CapacityMeter, QrDisplay } from "@rcene/kit/app";
import { CountUp } from "@rcene/ui/motion";
import { computeKpis, crewLoad } from "@/domain/kpis.ts";
import { CATEGORIES, newestFirst, type RequestRecord } from "@/domain/records.ts";
import { demoNow } from "@/domain/time.ts";
import { CATEGORY_ICONS, StatusBadge } from "@/features/requests/badges.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

/** Rows on the "Latest requests" page: what fits a TV at 1080p in board type. */
const LATEST = 5;

/**
 * /board: the public screen at the barangay hall, in the high-contrast malinaw palette
 * (AppLayout forces it for this route). Three pages rotate; the status line under the
 * title is the only part announced to screen readers, and it changes when a request is
 * filed in the console window.
 */
export function Board() {
  const t = useT(strings);
  const fmt = useFormat();
  const records = useRecords((s) => s.records);
  const kpis = computeKpis(records, demoNow());
  const latest = newestFirst(records).slice(0, LATEST);
  const newest = latest[0];
  const trackUrl = new URL("/resident", window.location.origin).href;

  return (
    <BoardShell
      title={t("board.title")}
      subtitle={t("board.subtitle")}
      status={
        newest && (
          <>
            <BellRingIcon aria-hidden="true" className="size-8 shrink-0 text-primary" />
            {t("board.status", { n: fmt.number(kpis.open), code: newest.code })}
          </>
        )
      }
      footer={
        <>
          <p className="max-w-xl">{t("board.footer")}</p>
          <QrDisplay value={trackUrl} label={t("board.qr")} size={112} />
        </>
      }
    >
      <BoardRotator
        label={t("board.title")}
        intervalMs={12_000}
        items={[
          <BoardPage key="glance" title={t("board.glance")}>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { id: "open", label: t("board.open"), value: kpis.open },
                { id: "due", label: t("board.due"), value: kpis.dueThisWeek },
                { id: "done", label: t("board.doneWeek"), value: kpis.doneThisWeek },
              ].map((stat) => (
                <div key={stat.id} className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-6 text-card-foreground">
                  <dt className="text-xl font-semibold text-muted-foreground lg:text-2xl">{stat.label}</dt>
                  <dd className="text-board-1 font-bold tabular-nums">
                    <CountUp value={stat.value} format={(n) => fmt.number(n)} />
                  </dd>
                </div>
              ))}
            </dl>
          </BoardPage>,
          <BoardPage key="latest" title={t("board.latest")}>
            <LatestList records={latest} />
          </BoardPage>,
          <BoardPage key="crews" title={t("board.crews")}>
            <ul className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
              {CATEGORIES.map((category) => {
                const load = crewLoad(records, category);
                return (
                  <li key={category}>
                    <CapacityMeter size="lg" label={t(`category.${category}`)} value={load.used} max={load.slots} />
                  </li>
                );
              })}
            </ul>
          </BoardPage>,
        ]}
      />
    </BoardShell>
  );
}

function BoardPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-board-2 font-bold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function LatestList({ records }: { records: RequestRecord[] }) {
  const t = useT(strings);
  return (
    <ul className="flex flex-col divide-y-2 divide-border rounded-2xl border-2 bg-card text-card-foreground">
      {records.map((record) => {
        const Icon = CATEGORY_ICONS[record.category];
        return (
          <li key={record.code} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 lg:px-6">
            <span className="text-board-3 font-bold tabular-nums">{record.code}</span>
            <span className="flex min-w-0 flex-1 items-center gap-3 text-xl lg:text-2xl">
              <Icon aria-hidden="true" className="size-7 shrink-0 text-primary" />
              <span className="font-semibold">{t(`category.${record.category}`)}</span>
              <span className="text-muted-foreground">{record.barangay}</span>
            </span>
            <StatusBadge status={record.status} size="lg" />
          </li>
        );
      })}
    </ul>
  );
}
