import { useId } from "react";
import { LEVEL_HEX, LEVELS, type Hazard, type Level } from "@rcene/data";
import { useAppStrings, useT } from "@rcene/i18n";
import { BOUNDARY_COLOR, COVERAGE_COLOR, LAND_COLOR } from "./style.ts";

export interface LegendProps {
  /** Title becomes the hazard name; otherwise "Legend". */
  hazard?: Hazard;
  /** Levels to list, least severe first. Default all four. */
  levels?: readonly Level[];
  /** Also explain the unpainted areas: not in a zone / outside coverage. Default true. */
  showStates?: boolean;
  /** Match the ZoneLayer's fill opacity so swatches look like the map. Default 0.45. */
  opacity?: number;
  className?: string;
}

/**
 * Map key with a text label on every swatch (color is never the only signal).
 * Swatches mimic the map: level fills over the coverage color with a level
 * outline, "not in zone" as plain coverage, "outside coverage" as land.
 */
export function Legend({ hazard, levels = LEVELS, showStates = true, opacity = 0.45, className }: LegendProps) {
  const t = useT(useAppStrings());
  const titleId = useId();
  const title = hazard ? t(`hazard.${hazard}`) : t("map.legend");
  const percent = Math.round(Math.min(1, Math.max(0, opacity)) * 100);

  return (
    <section
      aria-labelledby={titleId}
      className={[
        "z-10 rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow-sm backdrop-blur-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p id={titleId} className="mb-1.5 font-semibold">
        {title}
      </p>
      <ul className="grid gap-1">
        {levels.map((level) => (
          <li key={level} className="flex items-center gap-2">
            <Swatch
              fill={`color-mix(in srgb, ${LEVEL_HEX[level]} ${percent}%, ${COVERAGE_COLOR})`}
              border={LEVEL_HEX[level]}
            />
            {t(`level.${level}`)}
          </li>
        ))}
        {showStates && (
          <>
            <li className="flex items-center gap-2">
              <Swatch fill={COVERAGE_COLOR} border={BOUNDARY_COLOR} />
              {t("status.notInZone")}
            </li>
            <li className="flex items-center gap-2">
              <Swatch fill={LAND_COLOR} border={BOUNDARY_COLOR} dashed />
              {t("status.outsideCoverage")}
            </li>
          </>
        )}
      </ul>
    </section>
  );
}

function Swatch({ fill, border, dashed = false }: { fill: string; border: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3.5 shrink-0 rounded-[3px] border"
      style={{ backgroundColor: fill, borderColor: border, borderStyle: dashed ? "dashed" : "solid" }}
    />
  );
}
