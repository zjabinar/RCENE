import { useId } from "react";
import { BanIcon, DoorClosedIcon, DoorOpenIcon, GaugeIcon, type LucideIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export type CapacityState = "open" | "nearlyFull" | "full" | "over";

export interface CapacityThresholds {
  /** Share of `max` from which the place is "nearly full" (default 0.75). */
  warn: number;
  /** Share of `max` at which it is "full" (default 1). Above it: over capacity. */
  full: number;
}

export interface CapacityMeterProps {
  /** Current count (people, beds, slots). May exceed `max`. */
  value: number;
  max: number;
  /** What is measured, e.g. "Evacuees at BRGY-07 covered court". */
  label: string;
  thresholds?: CapacityThresholds;
  /** Show "value / max" and the spaces left (default true). */
  showNumbers?: boolean;
  /** "lg" for boards (bigger text and bar). */
  size?: "default" | "lg";
  className?: string;
}

const DEFAULT_THRESHOLDS: CapacityThresholds = { warn: 0.75, full: 1 };

/** The state for a count, with `thresholds` as shares of `max`. */
export function capacityState(
  value: number,
  max: number,
  thresholds: CapacityThresholds = DEFAULT_THRESHOLDS,
): CapacityState {
  const share = max > 0 ? value / max : value > 0 ? Number.POSITIVE_INFINITY : 0;
  if (share > thresholds.full) return "over";
  if (share >= thresholds.full) return "full";
  if (share >= thresholds.warn) return "nearlyFull";
  return "open";
}

const STATE_KEY = {
  open: "kit.capacity.open",
  nearlyFull: "kit.capacity.nearlyFull",
  full: "kit.capacity.full",
  over: "kit.capacity.over",
} as const;

const ICONS: Record<CapacityState, LucideIcon> = {
  open: DoorOpenIcon,
  nearlyFull: GaugeIcon,
  full: DoorClosedIcon,
  over: BanIcon,
};

/*
 * Capacity is not a hazard: no warning (yellow) or destructive (red) colours
 * and none of the hazard-level icons, so a meter next to hazard answers never
 * reads as a hazard level. The state is carried by the icon + word; the bar adds
 * a pattern for "full" (diagonal hatch) and "over capacity" (cross-hatch), so it
 * never relies on colour. Class names are written out in full for Tailwind.
 */
const BAR: Record<CapacityState, string> = {
  open: "bg-primary",
  nearlyFull: "bg-brand",
  full: "bg-foreground bg-[image:repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_oklab,var(--background)_45%,transparent)_6px_9px)]",
  over: "bg-foreground bg-[image:repeating-linear-gradient(135deg,transparent_0_5px,color-mix(in_oklab,var(--background)_45%,transparent)_5px_8px),repeating-linear-gradient(45deg,transparent_0_5px,color-mix(in_oklab,var(--background)_45%,transparent)_5px_8px)]",
};

const CHIP: Record<CapacityState, string> = {
  open: "bg-primary/10 text-primary",
  nearlyFull: "bg-brand text-brand-foreground",
  full: "bg-foreground text-background",
  over: "bg-foreground text-background",
};

/**
 * How full a place is: a role="meter" bar (primary, then brand, then
 * foreground with a hatch; never a hazard colour), the numbers, and an icon +
 * word state (OPEN, NEARLY FULL, FULL, OVER CAPACITY). Screen readers hear
 * "{value} of {max} — {state}".
 */
export function CapacityMeter({
  value,
  max,
  label,
  thresholds = DEFAULT_THRESHOLDS,
  showNumbers = true,
  size = "default",
  className,
}: CapacityMeterProps) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const labelId = useId();
  const state = capacityState(value, max, thresholds);
  const stateText = t(STATE_KEY[state]);
  const Icon = ICONS[state];
  const share = max > 0 ? Math.max(0, value) / max : value > 0 ? 1 : 0;
  const width = Math.min(1, share) * 100;
  const warnAt = Math.min(1, Math.max(0, thresholds.warn)) * 100;
  const large = size === "lg";
  const diff = max - value;

  return (
    <div
      data-slot="capacity-meter"
      data-state={state}
      className={cn("flex flex-col gap-2", large && "gap-3", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span id={labelId} className={cn("min-w-0 font-medium", large ? "text-board-3" : "text-sm")}>
          {label}
        </span>
        {showNumbers && (
          <span
            aria-hidden="true"
            className={cn("text-muted-foreground tabular-nums", large ? "text-board-3" : "text-sm")}
          >
            <span className={cn("font-semibold text-foreground", large ? "" : "text-base")}>{fmt.number(value)}</span>
            {" / "}
            {fmt.number(max)}
          </span>
        )}
      </div>

      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.max(0, Math.min(value, max))}
        aria-valuetext={t("kit.capacity.valueText", {
          value: fmt.number(value),
          max: fmt.number(max),
          state: stateText,
        })}
        className={cn("relative w-full overflow-hidden rounded-full bg-muted", large ? "h-5" : "h-3")}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-weave", BAR[state])}
          style={{ width: `${width}%` }}
        />
        {state === "open" && warnAt > 0 && warnAt < 100 && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-background/80"
            style={{ left: `${warnAt}%` }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          data-slot="capacity-state"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold tracking-wide uppercase",
            large ? "text-base" : "text-xs",
            CHIP[state],
          )}
        >
          <Icon aria-hidden="true" className={large ? "size-5" : "size-3.5"} />
          {stateText}
        </span>
        {showNumbers && (
          <span className={cn("text-muted-foreground tabular-nums", large ? "text-lg" : "text-xs")}>
            {diff >= 0
              ? t("kit.capacity.left", { n: fmt.number(diff) })
              : t("kit.capacity.overBy", { n: fmt.number(-diff) })}
          </span>
        )}
      </div>
    </div>
  );
}
