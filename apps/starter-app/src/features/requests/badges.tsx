/**
 * Small labels for a request: its status, category, priority and "overdue". Each one
 * is an icon plus a word (never colour alone), in theme tokens only. The request
 * steps are not hazard levels, so they never use the level-* or status-* colours.
 */
import {
  CalendarClockIcon,
  CircleCheckIcon,
  ClockAlertIcon,
  ConstructionIcon,
  DropletsIcon,
  InboxIcon,
  LampIcon,
  SearchCheckIcon,
  StampIcon,
  Trash2Icon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import type { Category, Status } from "@/domain/records.ts";
import { strings } from "@/i18n/strings.ts";

export const STATUS_ICONS: Record<Status, LucideIcon> = {
  received: InboxIcon,
  review: SearchCheckIcon,
  scheduled: CalendarClockIcon,
  done: CircleCheckIcon,
};

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  water: DropletsIcon,
  road: ConstructionIcon,
  waste: Trash2Icon,
  streetlight: LampIcon,
  permit: StampIcon,
};

/** One look per step: quiet while waiting, stronger as the request moves on. */
const STATUS_TONE: Record<Status, string> = {
  received: "border-border bg-card text-foreground",
  review: "border-transparent bg-accent text-accent-foreground",
  scheduled: "border-transparent bg-highlight text-highlight-foreground",
  done: "border-transparent bg-primary text-primary-foreground",
};

const CHIP = "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap";
const SIZE = {
  sm: "px-2.5 py-0.5 text-xs [&>svg]:size-3.5",
  lg: "px-4 py-1.5 text-lg font-semibold [&>svg]:size-5",
} as const;

export function StatusBadge({ status, size = "sm", className }: { status: Status; size?: "sm" | "lg"; className?: string }) {
  const t = useT(strings);
  const Icon = STATUS_ICONS[status];
  return (
    <span data-status={status} className={cn(CHIP, SIZE[size], STATUS_TONE[status], className)}>
      <Icon aria-hidden="true" />
      {t(`record.status.${status}`)}
    </span>
  );
}

/** "Urgent" as a chip; "Normal" as plain text (only the exception should stand out). */
export function PriorityBadge({ urgent, className }: { urgent: boolean; className?: string }) {
  const t = useT(strings);
  if (!urgent) return <span className={cn("text-sm text-muted-foreground", className)}>{t("priority.normal")}</span>;
  return (
    <span className={cn(CHIP, SIZE.sm, "border-warning-foreground/30 bg-warning text-warning-foreground", className)}>
      <TriangleAlertIcon aria-hidden="true" />
      {t("priority.urgent")}
    </span>
  );
}

export function OverdueBadge({ className }: { className?: string }) {
  const t = useT(strings);
  return (
    <span className={cn(CHIP, SIZE.sm, "border-destructive/30 bg-destructive/10 text-destructive", className)}>
      <ClockAlertIcon aria-hidden="true" />
      {t("detail.overdue")}
    </span>
  );
}

/** The category's icon and name, inline. */
export function CategoryLabel({ category, className }: { category: Category; className?: string }) {
  const t = useT(strings);
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
      {t(`category.${category}`)}
    </span>
  );
}
