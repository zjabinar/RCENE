/**
 * Share of the city's land in a mapped zone, one bar per hazard layer, in a
 * ChartCard (Chart / Table switch; the table is always in the page for
 * screen readers). Hazards are categories here, not levels, so the bars use
 * a chart colour, never a hazard-level colour.
 */
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { useFormat, useT } from "@rcene/i18n";
import { ChartCard } from "@rcene/kit/app";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@rcene/ui/components/chart";
import { useReducedMotion } from "@rcene/ui/motion";
import { sharePercent, type CityStats } from "@/domain/city-stats.ts";
import { strings } from "@/i18n/strings.ts";

export interface HazardShareChartProps {
  stats: CityStats;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

export function HazardShareChart({ stats, headingLevel = 3, className }: HazardShareChartProps) {
  const t = useT(strings);
  const fmt = useFormat();
  const reduced = useReducedMotion();
  const rows = stats.byHazard.map((s) => ({ hazard: s.hazard, name: t(`hazard.${s.hazard}`), share: sharePercent(s.share) }));
  const percent = (v: number | string) => `${fmt.number(Number(v), Number.isInteger(Number(v)) ? 0 : 1)}%`;
  const config = { share: { label: t("story.chart.share"), color: "var(--chart-1)" } } satisfies ChartConfig;

  const caveats = [t("data.landNotPeople")];
  if (stats.missing.length > 0) {
    caveats.unshift(t("story.chart.missing", { hazards: stats.missing.map((h) => t(`hazard.${h}`)).join(", ") }));
  }

  return (
    <ChartCard
      title={t("story.chart.title")}
      description={t("story.chart.lead")}
      caveat={caveats.join(" ")}
      headingLevel={headingLevel}
      className={className}
      table={{ columns: [t("story.chart.hazard"), t("story.chart.share")], rows: rows.map((r) => [r.name, r.share]) }}
    >
      <ChartContainer config={config} className="aspect-auto h-72">
        <BarChart data={rows} layout="vertical" accessibilityLayer margin={{ top: 4, right: 56, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={percent} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatValue={percent} />} />
          <Bar dataKey="share" fill="var(--color-share)" radius={[0, 4, 4, 0]} maxBarSize={28} isAnimationActive={!reduced}>
            <LabelList dataKey="share" position="right" className="fill-foreground text-xs font-semibold" formatter={(v) => percent(Number(v))} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
