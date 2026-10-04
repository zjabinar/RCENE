import type { ReactNode } from "react";
import { CircleCheckIcon, CircleDashedIcon, CircleDotIcon, OctagonXIcon, type LucideIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export type TimelineState = "done" | "current" | "upcoming" | "blocked";

export interface StatusTimelineItem {
  id: string;
  label: string;
  /** A Date, an ISO string (formatted for the language), or text shown as is ("Day 2"). */
  time?: Date | string;
  state: TimelineState;
  note?: ReactNode;
}

export interface StatusTimelineProps {
  items: StatusTimelineItem[];
  /** "horizontal" lays the steps out in a row from sm up (still a column on phones). Default "vertical". */
  orientation?: "vertical" | "horizontal";
  /** Accessible name of the list (default "Status timeline"). */
  label?: string;
  className?: string;
}

const ICONS: Record<TimelineState, LucideIcon> = {
  done: CircleCheckIcon,
  current: CircleDotIcon,
  upcoming: CircleDashedIcon,
  blocked: OctagonXIcon,
};

const MARKER: Record<TimelineState, string> = {
  done: "bg-primary text-primary-foreground",
  current: "bg-card text-primary ring-2 ring-primary",
  upcoming: "border-2 border-dashed border-border bg-card text-muted-foreground",
  blocked: "bg-destructive text-destructive-foreground",
};

const CHIP: Record<TimelineState, string> = {
  done: "text-primary",
  current: "bg-primary/10 text-primary",
  upcoming: "text-muted-foreground",
  blocked: "bg-destructive/10 text-destructive",
};

type Fmt = ReturnType<typeof useFormat>;

function when(time: Date | string, fmt: Fmt): { iso?: string; text: string } {
  if (time instanceof Date) return { iso: time.toISOString(), text: `${fmt.date(time)} · ${fmt.time(time)}` };
  const parsed = /^\d{4}-\d{2}-\d{2}/.test(time) ? new Date(time) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return { text: time };
  return { iso: time, text: time.includes("T") ? `${fmt.date(parsed)} · ${fmt.time(parsed)}` : fmt.date(parsed) };
}

/**
 * Where a request or a process stands: an ordered list of steps, each with an
 * icon and a state word (never colour alone); the current one is
 * aria-current="step".
 */
export function StatusTimeline({ items, orientation = "vertical", label, className }: StatusTimelineProps) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const row = orientation === "horizontal";

  return (
    <ol
      data-slot="status-timeline"
      data-orientation={orientation}
      aria-label={label ?? t("kit.timeline.label")}
      className={cn("flex flex-col", row && "sm:flex-row", className)}
    >
      {items.map((item, i) => {
        const Icon = ICONS[item.state];
        const last = i === items.length - 1;
        const time = item.time === undefined ? null : when(item.time, fmt);
        return (
          <li
            key={item.id}
            data-state={item.state}
            aria-current={item.state === "current" ? "step" : undefined}
            className={cn("relative flex gap-4 pb-7 last:pb-0", row && "sm:flex-1 sm:flex-col sm:gap-3 sm:pr-4 sm:pb-0")}
          >
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-10 bottom-1 left-[1.0625rem] w-0.5 rounded-full",
                  row && "sm:top-[1.0625rem] sm:right-1 sm:bottom-auto sm:left-11 sm:h-0.5 sm:w-auto",
                  item.state === "done" ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-full", MARKER[item.state])}
            >
              {item.state === "current" && (
                <span className="absolute inset-0 rounded-full bg-primary/25 motion-safe:animate-ping" />
              )}
              <Icon className="relative size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1 pt-1.5">
              <span className={cn("leading-tight font-semibold", item.state === "upcoming" && "text-muted-foreground")}>
                {item.label}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full text-xs font-semibold",
                    (item.state === "current" || item.state === "blocked") && "px-2 py-0.5",
                    CHIP[item.state],
                  )}
                >
                  {t(`kit.timeline.${item.state}`)}
                </span>
                {time &&
                  (time.iso ? (
                    <time dateTime={time.iso} className="text-muted-foreground tabular-nums">
                      {time.text}
                    </time>
                  ) : (
                    <span className="text-muted-foreground">{time.text}</span>
                  ))}
              </span>
              {item.note && <div className="text-sm text-muted-foreground">{item.note}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
