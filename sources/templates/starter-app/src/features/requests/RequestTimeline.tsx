import { useFormat, useT } from "@rcene/i18n";
import { StatusTimeline, type StatusTimelineItem } from "@rcene/kit/app";
import { progress } from "@/domain/kpis.ts";
import type { RequestRecord } from "@/domain/records.ts";
import { strings } from "@/i18n/strings.ts";

/**
 * A request's four steps as a StatusTimeline: the steps reached carry their time, the
 * current one says what is happening, and "Done" shows the target date until it is reached.
 */
export function RequestTimeline({ record, className }: { record: RequestRecord; className?: string }) {
  const t = useT(strings);
  const fmt = useFormat();
  const items = progress(record).map(({ status, state, at }): StatusTimelineItem => {
    const note =
      state === "current" && status !== "done"
        ? t(`detail.note.${status}`)
        : status === "done" && state === "upcoming"
          ? t("detail.target", { date: fmt.date(new Date(record.dueAt)) })
          : undefined;
    return { id: status, label: t(`record.status.${status}`), state, time: at, note };
  });
  return <StatusTimeline items={items} label={t("detail.progress")} className={className} />;
}
