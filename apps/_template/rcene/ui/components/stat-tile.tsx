import type { ReactNode } from "react";
import { OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";
import { useFormat } from "@rcene/i18n";

import { cn } from "../lib/utils.ts";
import { CountUp } from "../motion/count-up.tsx";

export interface StatTileProps {
  label: ReactNode;
  value: number | string;
  hint?: ReactNode;
  /** warning / danger add an icon as well as color. */
  tone?: "default" | "warning" | "danger";
  /** Animate numeric values with <CountUp/>. */
  countUp?: boolean;
  /** Number formatter. Default: locale-aware, 0 decimals for integers, 1 otherwise. */
  format?: (n: number) => string;
  className?: string;
}

const TONE_CLASSES = {
  default: "",
  warning: "border-warning-foreground/30 bg-warning/60",
  danger: "border-destructive/40 bg-destructive/5",
} as const;

/** A big number with a label and optional hint, as a <dl>. */
export function StatTile({ label, value, hint, tone = "default", countUp = false, format, className }: StatTileProps) {
  const fmt = useFormat();
  const formatNumber =
    format ?? ((n: number) => fmt.number(n, typeof value === "number" && !Number.isInteger(value) ? 1 : 0));
  const ToneIcon = tone === "warning" ? TriangleAlertIcon : tone === "danger" ? OctagonAlertIcon : null;

  return (
    <dl
      data-slot="stat-tile"
      data-tone={tone}
      className={cn(
        "flex flex-col gap-1 rounded-xl border bg-card p-4 text-card-foreground shadow-sm",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <dt className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {ToneIcon && (
          <ToneIcon
            aria-hidden="true"
            className={cn("size-4 shrink-0", tone === "warning" ? "text-warning-foreground" : "text-destructive")}
          />
        )}
        <span className="min-w-0">{label}</span>
      </dt>
      <dd
        className={cn(
          "text-3xl leading-tight font-semibold tracking-tight tabular-nums",
          tone === "warning" && "text-warning-foreground",
          tone === "danger" && "text-destructive",
        )}
      >
        {typeof value === "number" ? (
          countUp ? (
            <CountUp value={value} format={formatNumber} />
          ) : (
            formatNumber(value)
          )
        ) : (
          value
        )}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </dl>
  );
}
