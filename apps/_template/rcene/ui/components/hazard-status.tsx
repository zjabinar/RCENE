import { useRef } from "react";
import {
  CircleAlertIcon,
  CircleMinusIcon,
  FileQuestionMarkIcon,
  MapPinOffIcon,
  OctagonAlertIcon,
  SirenIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { HAZARDS, type Hazard, type HazardStatus, type Level } from "@rcene/data";
import { common, useT } from "@rcene/i18n";

import { cn } from "../lib/utils.ts";
import { gsap, useGSAP } from "../motion/gsap.ts";
import { useReducedMotion } from "../motion/use-reduced-motion.ts";

/** One icon per level, escalating in shape: circle → triangle → octagon → siren. */
export const LEVEL_ICONS: Record<Level, LucideIcon> = {
  low: CircleAlertIcon,
  moderate: TriangleAlertIcon,
  high: OctagonAlertIcon,
  veryHigh: SirenIcon,
};

/** Icons for the two non-zone answers. Neither is a check mark: "not in zone" is not "safe". */
export const STATUS_ICONS: Record<"notInZone" | "outsideCoverage", LucideIcon> = {
  notInZone: CircleMinusIcon,
  outsideCoverage: MapPinOffIcon,
};

const LEVEL_CLASSES: Record<Level, string> = {
  low: "border-level-low bg-level-low text-level-low-foreground",
  moderate: "border-level-moderate bg-level-moderate text-level-moderate-foreground",
  high: "border-level-high bg-level-high text-level-high-foreground",
  veryHigh: "border-level-veryHigh bg-level-veryHigh text-level-veryHigh-foreground",
};

const STATUS_CLASSES = {
  notInZone: "border-status-not-in-zone bg-status-not-in-zone/10 text-foreground [&>svg]:text-status-not-in-zone",
  outsideCoverage: "border-dashed border-status-outside bg-status-outside/10 text-foreground [&>svg]:text-muted-foreground",
} as const;

const SIZE_CLASSES = {
  sm: "gap-1.5 px-2 py-1 text-xs [&>svg]:size-3.5",
  md: "gap-2 px-3 py-2 text-sm [&>svg]:size-4",
} as const;

const BASE =
  "inline-flex max-w-full items-center rounded-md border-2 leading-snug font-medium [&>svg]:shrink-0";

export interface HazardStatusBadgeProps {
  hazard: Hazard;
  status: HazardStatus;
  size?: "sm" | "md";
  className?: string;
}

/**
 * The hazard answer for one hazard: color + icon + text, always together.
 * inZone uses the level colors; notInZone is neutral slate (never green);
 * outsideCoverage is gray with a dashed border.
 */
export function HazardStatusBadge({ hazard, status, size = "md", className }: HazardStatusBadgeProps) {
  const t = useT(common);
  const Icon = status.kind === "inZone" ? LEVEL_ICONS[status.level] : STATUS_ICONS[status.kind];
  const phrase =
    status.kind === "inZone"
      ? t("status.inZone", { level: t(`level.${status.level}`) })
      : status.kind === "notInZone"
        ? t("status.notInZone")
        : t("status.outsideCoverage");
  const tone = status.kind === "inZone" ? LEVEL_CLASSES[status.level] : STATUS_CLASSES[status.kind];

  return (
    <span
      data-slot="hazard-status-badge"
      data-hazard={hazard}
      data-status={status.kind}
      data-level={status.kind === "inZone" ? status.level : undefined}
      className={cn(BASE, SIZE_CLASSES[size], tone, className)}
    >
      <Icon aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-semibold">{t(`hazard.${hazard}`)}</span>
        <span aria-hidden="true"> · </span>
        <span className="sr-only">: </span>
        <span className="font-normal">{phrase}</span>
      </span>
    </span>
  );
}

export interface LevelBadgeProps {
  level: Level;
  size?: "sm" | "md";
  className?: string;
}

/** A bare level chip (color + icon + translated level name), for tables and legends. */
export function LevelBadge({ level, size = "sm", className }: LevelBadgeProps) {
  const t = useT(common);
  const Icon = LEVEL_ICONS[level];
  return (
    <span
      data-slot="level-badge"
      data-level={level}
      className={cn(BASE, SIZE_CLASSES[size], LEVEL_CLASSES[level], className)}
    >
      <Icon aria-hidden="true" />
      <span>{t(`level.${level}`)}</span>
    </span>
  );
}

export interface HazardStatusListProps {
  /** Answer per hazard, e.g. from lookupHazards(). Hazards without an entry are skipped. */
  status: Partial<Record<Hazard, HazardStatus>>;
  /** Hazards whose layer is not loaded; each gets a "data not available" line. */
  missing?: readonly Hazard[];
  /** Display order and filter. Default: HAZARDS. */
  order?: readonly Hazard[];
  size?: "sm" | "md";
  className?: string;
}

/** One HazardStatusBadge per hazard, staggering in with GSAP (skipped under reduced motion). */
export function HazardStatusList({ status, missing = [], order = HAZARDS, size = "md", className }: HazardStatusListProps) {
  const t = useT(common);
  const root = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const rows = order.filter((hazard) => status[hazard] || missing.includes(hazard));
  const key = rows
    .map((hazard) => {
      const s = status[hazard];
      if (!s) return `${hazard}:missing`;
      return s.kind === "inZone" ? `${hazard}:${s.level}` : `${hazard}:${s.kind}`;
    })
    .join("|");

  useGSAP(
    () => {
      if (reduced || !key) return;
      gsap.from("[data-slot='hazard-status-item']", {
        y: 8,
        autoAlpha: 0,
        duration: 0.35,
        stagger: 0.06,
        ease: "power2.out",
      });
    },
    { scope: root, dependencies: [key, reduced], revertOnUpdate: true },
  );

  return (
    <ul ref={root} data-slot="hazard-status-list" aria-live="polite" className={cn("flex flex-col gap-2", className)}>
      {rows.map((hazard) => {
        const s = status[hazard];
        return (
          <li key={hazard} data-slot="hazard-status-item" className="flex">
            {s ? (
              <HazardStatusBadge hazard={hazard} status={s} size={size} />
            ) : (
              <span
                data-slot="hazard-status-missing"
                data-hazard={hazard}
                className={cn(BASE, SIZE_CLASSES[size], "border-dotted border-muted-foreground/40 bg-muted/40 text-muted-foreground")}
              >
                <FileQuestionMarkIcon aria-hidden="true" />
                <span className="min-w-0">
                  <span className="font-semibold">{t(`hazard.${hazard}`)}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="sr-only">: </span>
                  <span className="font-normal">{t("state.dataMissing")}</span>
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
