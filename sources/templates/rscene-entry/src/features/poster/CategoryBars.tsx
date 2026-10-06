/**
 * Requests by category as a plain SVG bar chart: it prints (a WebGL map or a canvas does
 * not) and downloads through PosterFigure. Colours from the chart tokens, labels and
 * numbers in the bars, so it reads without colour.
 */
import { useFormat, useT } from "@rcene/i18n";
import { countBy } from "@/domain/kpis.ts";
import { CATEGORIES, type RequestRecord } from "@/domain/records.ts";
import { strings } from "@/i18n/strings.ts";

const ROW = 34;
const LABEL = 150;
const WIDTH = 520;

export function CategoryBars({ records, className }: { records: readonly RequestRecord[]; className?: string }) {
  const t = useT(strings);
  const fmt = useFormat();
  const counts = countBy(records, (r) => r.category, CATEGORIES);
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
              {t(`category.${key}`)}
            </text>
            <rect x={LABEL} y={y + 6} width={w} height={ROW - 12} rx={4} style={{ fill: `var(--chart-${(i % 5) + 1})` }} />
            <text x={LABEL + w + 8} y={y + ROW / 2} dominantBaseline="middle" className="fill-foreground text-[13px] font-semibold">
              {fmt.number(count)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
