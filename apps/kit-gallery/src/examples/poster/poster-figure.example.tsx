import { useFormat, useT } from "@rcene/i18n";
import { PosterFigure } from "@rcene/kit/poster";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "PosterFigure",
  summary: {
    en: "A captioned figure for the poster: title, an SVG chart, caption and source, with a Download SVG button for the print shop. Use SVG: WebGL maps do not print.",
    war: "Usa nga figure para ha poster: titulo, SVG nga chart, caption ngan tinikangan, upod an Download SVG. Gamita an SVG: diri naiimprinta an WebGL nga mapa.",
    fil: "Isang figure para sa poster: pamagat, SVG na chart, caption at pinagmulan, may Download SVG. Gumamit ng SVG: hindi naipi-print ang WebGL na mapa.",
  },
  blocks: ["PosterFigure"],
  order: 20,
  frameHeight: 620,
};

const strings = {
  en: {
    title: "Households in mapped flood zones",
    caption: "1,536 households in all; BRGY-01 and BRGY-02 hold half of them.",
    source: "Synthetic households coded HH-0001…, seed 7",
    chart: "Bar chart of households in mapped flood zones by barangay: BRGY-01 412, BRGY-02 365, BRGY-03 298, BRGY-04 214, BRGY-05 160, BRGY-06 87.",
    households: "{n} households",
  },
  war: {
    title: "Mga panimalay ha mapa nga zone han baha",
    caption: "1,536 nga panimalay ha kabug-osan; katunga hini aada ha BRGY-01 ngan BRGY-02.",
    households: "{n} nga panimalay",
  },
  fil: {
    title: "Mga sambahayan sa mapang zone ng baha",
    caption: "1,536 na sambahayan lahat; kalahati nito ay nasa BRGY-01 at BRGY-02.",
    households: "{n} sambahayan",
  },
};

const ROWS = [
  { code: "BRGY-01", value: 412 },
  { code: "BRGY-02", value: 365 },
  { code: "BRGY-03", value: 298 },
  { code: "BRGY-04", value: 214 },
  { code: "BRGY-05", value: 160 },
  { code: "BRGY-06", value: 87 },
];

const WIDTH = 560;
const LEFT = 76;
const RIGHT = 56;
const ROW = 34;
const BAR = 20;

/** A horizontal bar: square at the baseline, a 4 px rounded data end. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const run = Math.max(0, w - r);
  return `M${x} ${y}h${run}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-run}z`;
}

function HouseholdsChart() {
  const t = useT(strings);
  const fmt = useFormat();
  const max = Math.max(...ROWS.map((r) => r.value));
  const height = ROWS.length * ROW + 8;
  const scale = (WIDTH - LEFT - RIGHT) / max;
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} width={WIDTH} height={height} role="img" aria-label={t("chart")} className="w-full">
      {ROWS.map((row, i) => {
        const y = 4 + i * ROW;
        const w = row.value * scale;
        return (
          <g key={row.code}>
            <title>{`${row.code}: ${t("households", { n: fmt.number(row.value) })}`}</title>
            <text x={LEFT - 10} y={y + BAR / 2 + 4} textAnchor="end" className="fill-muted-foreground text-[12px]">
              {row.code}
            </text>
            <path d={barPath(LEFT, y, w, BAR)} className="fill-chart-1" />
            <text x={LEFT + w + 6} y={y + BAR / 2 + 4} className="fill-foreground text-[12px] font-semibold tabular-nums">
              {fmt.number(row.value)}
            </text>
          </g>
        );
      })}
      <line x1={LEFT} x2={LEFT} y1={0} y2={height} className="stroke-border" strokeWidth="1" />
    </svg>
  );
}

export function Example() {
  const t = useT(strings);
  return (
    <PosterFigure
      title={t("title")}
      caption={t("caption")}
      source={t("source")}
      downloadSvg="households-flood-zones"
      className="max-w-2xl text-lg"
    >
      <HouseholdsChart />
    </PosterFigure>
  );
}
