/**
 * Two single-series bar charts in ChartCards (each with its data as a table too):
 * requests by status (columns, in step order) and by category (bars, largest first).
 * Recharts runs inside ChartContainer, so the bars take the palette's --chart-* colours
 * through --color-requests and follow light and dark mode. Each bar carries its value
 * at the tip, so there are no gridlines or value axis.
 */
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { useFormat, useT } from "@rcene/i18n";
import { ChartCard } from "@rcene/kit/app";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@rcene/ui/components/chart";
import { useReducedMotion } from "@rcene/ui/motion";
import { countBy } from "@/domain/kpis.ts";
import { CATEGORIES, STATUSES, type RequestRecord } from "@/domain/records.ts";
import { strings } from "@/i18n/strings.ts";

/** Bars stay thin (at most 24 px) with a 4 px rounded end, per the dataviz mark spec. */
const BAR_SIZE = 24;

interface ChartProps {
  records: readonly RequestRecord[];
  className?: string;
}

export function StatusChart({ records, className }: ChartProps) {
  const t = useT(strings);
  const fmt = useFormat();
  const reduced = useReducedMotion();
  const config = { requests: { label: t("chart.requests"), color: "var(--chart-1)" } } satisfies ChartConfig;
  const rows = countBy(records, (r) => r.status, STATUSES).map(({ key, count }) => ({
    label: t(`record.status.${key}`),
    requests: count,
  }));

  return (
    <ChartCard
      className={className}
      title={t("chart.status.title")}
      description={t("chart.status.lead")}
      caveat={t("chart.caveat")}
      table={{ columns: [t("col.status"), t("chart.requests")], rows: rows.map((r) => [r.label, r.requests]) }}
    >
      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        <BarChart data={rows} accessibilityLayer margin={{ top: 24, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--border)" }} tickMargin={10} interval={0} />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatValue={(v) => fmt.number(Number(v))} />} />
          <Bar dataKey="requests" fill="var(--color-requests)" radius={[4, 4, 0, 0]} maxBarSize={BAR_SIZE} isAnimationActive={!reduced}>
            <LabelList dataKey="requests" position="top" offset={8} className="fill-foreground text-sm font-semibold" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

export function CategoryChart({ records, className }: ChartProps) {
  const t = useT(strings);
  const fmt = useFormat();
  const reduced = useReducedMotion();
  const config = { requests: { label: t("chart.requests"), color: "var(--chart-2)" } } satisfies ChartConfig;
  const rows = countBy(records, (r) => r.category, CATEGORIES)
    .map(({ key, count }) => ({ label: t(`category.${key}`), requests: count }))
    .sort((a, b) => b.requests - a.requests);

  return (
    <ChartCard
      className={className}
      title={t("chart.category.title")}
      description={t("chart.category.lead")}
      caveat={t("chart.caveat")}
      table={{ columns: [t("col.category"), t("chart.requests")], rows: rows.map((r) => [r.label, r.requests]) }}
    >
      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        <BarChart data={rows} layout="vertical" accessibilityLayer margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
          <YAxis dataKey="label" type="category" tickLine={false} axisLine={{ stroke: "var(--border)" }} width={104} tickMargin={8} />
          <XAxis type="number" hide allowDecimals={false} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatValue={(v) => fmt.number(Number(v))} />} />
          <Bar dataKey="requests" fill="var(--color-requests)" radius={[0, 4, 4, 0]} maxBarSize={BAR_SIZE} isAnimationActive={!reduced}>
            <LabelList dataKey="requests" position="right" offset={8} className="fill-foreground text-sm font-semibold" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
