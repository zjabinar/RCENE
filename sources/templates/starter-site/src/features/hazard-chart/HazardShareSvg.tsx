/**
 * The hazard shares as a plain SVG bar chart, for the poster: it prints
 * sharp, scales with the panel and downloads as a standalone .svg
 * (PosterFigure downloadSvg). On screen pages use HazardShareChart instead.
 */
import { useFormat, useT } from "@rcene/i18n";
import { sharePercent, type HazardShare } from "@/domain/city-stats.ts";
import { strings } from "@/i18n/strings.ts";

const WIDTH = 420;
const LEFT = 118;
const RIGHT = 52;
const ROW = 30;
const BAR = 18;

/** A horizontal bar: square at the baseline, a rounded data end. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const radius = Math.min(r, w / 2, h / 2);
  const run = Math.max(0, w - radius);
  return `M${x} ${y}h${run}a${radius} ${radius} 0 0 1 ${radius} ${radius}v${h - 2 * radius}a${radius} ${radius} 0 0 1 ${-radius} ${radius}h${-run}z`;
}

export function HazardShareSvg({ shares, className }: { shares: readonly HazardShare[]; className?: string }) {
  const t = useT(strings);
  const fmt = useFormat();
  const height = shares.length * ROW + 6;
  const scale = (WIDTH - LEFT - RIGHT) / 100;
  const rows = shares.map((s) => {
    const percent = sharePercent(s.share);
    return { ...s, name: t(`hazard.${s.hazard}`), percent, text: `${fmt.number(percent, Number.isInteger(percent) ? 0 : 1)}%` };
  });
  const description = rows.map((r) => `${r.name} ${r.text}`).join(", ");

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label={`${t("poster.data.chart")}: ${description}`} className={className ?? "h-auto w-full"}>
      {/* 100 % guide: the full width of the city */}
      <rect x={LEFT} y={0} width={100 * scale} height={height} rx={4} className="fill-muted" />
      {rows.map((row, i) => {
        const y = 4 + i * ROW;
        const w = Math.max(row.percent * scale, 1);
        return (
          <g key={row.hazard}>
            <text x={LEFT - 8} y={y + BAR / 2 + 4} textAnchor="end" className="fill-foreground text-[12px]">
              {row.name}
            </text>
            <path d={barPath(LEFT, y, w, BAR)} className="fill-chart-1" />
            <text x={LEFT + w + 6} y={y + BAR / 2 + 4} className="fill-foreground text-[12px] font-semibold tabular-nums">
              {row.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
