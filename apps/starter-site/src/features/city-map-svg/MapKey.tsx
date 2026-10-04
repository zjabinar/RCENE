/**
 * The key for a CityMapSvg figure: hazard levels (swatch + icon + word) and
 * the facility dots. Colour is never the only signal.
 */
import { LEVELS, type Hazard, type Level } from "@rcene/data";
import { useT } from "@rcene/i18n";
import { LEVEL_ICONS } from "@rcene/ui";
import { cn } from "@rcene/ui/lib/utils";
import { strings } from "@/i18n/strings.ts";

const LEVEL_SWATCH: Record<Level, string> = {
  low: "bg-level-low/60 border-level-low",
  moderate: "bg-level-moderate/60 border-level-moderate",
  high: "bg-level-high/60 border-level-high",
  veryHigh: "bg-level-veryHigh/60 border-level-veryHigh",
};

export interface MapKeyProps {
  hazard?: Hazard;
  /** "all": one dot for every facility; "split": in a mapped zone vs other. */
  facilities?: "none" | "all" | "split";
  /** Label of the highlighted dots in "split" mode. Default: in a mapped flood zone. */
  inZoneLabel?: string;
  className?: string;
}

export function MapKey({ hazard, facilities = "none", inZoneLabel, className }: MapKeyProps) {
  const t = useT(strings);
  return (
    <div className={cn("flex flex-wrap gap-x-6 gap-y-2 text-[0.85em]", className)}>
      {hazard && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{t(`hazard.${hazard}`)}</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {LEVELS.map((level) => {
              const Icon = LEVEL_ICONS[level];
              return (
                <li key={level} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={cn("size-3.5 rounded-[3px] border", LEVEL_SWATCH[level])} />
                  <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  {t(`level.${level}`)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {facilities !== "none" && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{t("key.facilities")}</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {facilities === "split" && (
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-card bg-brand shadow-[0_0_0_1px_var(--border)]" />
                {inZoneLabel ?? t("key.inZone")}
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-3 rounded-full border-2 border-card bg-primary shadow-[0_0_0_1px_var(--border)]" />
              {facilities === "split" ? t("key.other") : t("key.facilities")}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
