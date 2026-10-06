/**
 * Barangays by highest mapped level of one hazard, as a plain SVG bar chart: it prints
 * (a WebGL map or a canvas does not) and downloads through PosterFigure. Colours from
 * the --level-* tokens, labels and numbers beside the bars, so it reads without colour.
 */
import type { BarangayHazardRow, Hazard } from "@rcene/data";
import { useFormat, useT } from "@rcene/i18n";
import { barangaysByTopLevel } from "@/domain/exposure.ts";
import { strings } from "@/i18n/strings.ts";

const ROW = 34;
const LABEL = 150;
const WIDTH = 520;

export function LevelBars({ rows, hazard, className }: { rows: readonly BarangayHazardRow[]; hazard: Hazard; className?: string }) {
  const t = useT(strings);
  const fmt = useFormat();
  const counts = barangaysByTopLevel(rows, hazard);
  const max = Math.max(1, ...counts.map((c) => c.count));
  const height = counts.length * ROW;
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={t("poster.picture.title")} className={className}>
      {counts.map(({ key, count }, i) => {
        const w = Math.max(2, ((WIDTH - LABEL - 48) * count) / max);
        const y = i * ROW;
        return (
          <g key={key}>
            <text x={0} y={y + ROW / 2} dominantBaseline="middle" className="fill-foreground text-[13px]">
              {key === "none" ? t("result.noZone") : t(`level.${key}`)}
            </text>
            <rect x={LABEL} y={y + 6} width={w} height={ROW - 12} rx={4} style={{ fill: key === "none" ? "var(--muted-foreground)" : `var(--level-${key})` }} />
            <text x={LABEL + w + 8} y={y + ROW / 2} dominantBaseline="middle" className="fill-foreground text-[13px] font-semibold">
              {fmt.number(count)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
