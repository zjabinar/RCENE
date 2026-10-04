import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useFormat, useT } from "@rcene/i18n";
import { ChartCard } from "@rcene/kit/app";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@rcene/ui/components/chart";
import { useReducedMotion } from "@rcene/ui/motion";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "ChartCard",
  summary: {
    en: "A chart with a Chart / Table switch: the same numbers as a table are always in the page for screen readers, with an honest note under it.",
    war: "Tsart nga may Tsart / Talaan nga switch: an pareho nga numero sugad nga talaan permi aadi para ha screen reader, upod an matinud-anon nga pahinumdom.",
    fil: "Tsart na may Tsart / Talahanayan na switch: laging nasa pahina ang parehong numero bilang talahanayan para sa screen reader, kasama ang tapat na paalala.",
  },
  blocks: ["ChartCard"],
  order: 40,
  frameHeight: 720,
};

const strings = {
  en: {
    title: "Requests by barangay",
    lead: "1–7 October 2026, open and closed",
    barangay: "Barangay",
    open: "Open",
    closed: "Closed",
    caveat: "Sample data: generated for the gallery, not real requests.",
  },
  war: {
    title: "Mga hangyo kada barangay",
    lead: "1–7 Oktubre 2026, bukas ngan sirado",
    open: "Bukas",
    closed: "Sirado",
    caveat: "Sample nga datos: gin-himo para ha gallery, diri tinuod nga mga hangyo.",
  },
  fil: {
    title: "Mga kahilingan bawat barangay",
    lead: "1–7 Oktubre 2026, bukas at sarado",
    open: "Bukas",
    closed: "Sarado",
    caveat: "Sample na datos: ginawa para sa gallery, hindi totoong mga kahilingan.",
  },
};

const ROWS = [
  { barangay: "BRGY-01", open: 6, closed: 14 },
  { barangay: "BRGY-02", open: 3, closed: 9 },
  { barangay: "BRGY-03", open: 9, closed: 11 },
  { barangay: "BRGY-04", open: 2, closed: 7 },
  { barangay: "BRGY-05", open: 11, closed: 16 },
  { barangay: "BRGY-06", open: 4, closed: 5 },
];

export function Example() {
  const t = useT(strings);
  const fmt = useFormat();
  const reduced = useReducedMotion();
  const config = {
    open: { label: t("open"), color: "var(--chart-1)" },
    closed: { label: t("closed"), color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <ChartCard
      title={t("title")}
      description={t("lead")}
      caveat={t("caveat")}
      table={{
        columns: [t("barangay"), t("open"), t("closed")],
        rows: ROWS.map((r) => [r.barangay, r.open, r.closed]),
      }}
    >
      <ChartContainer config={config} className="aspect-auto h-64 sm:h-72">
        <BarChart data={ROWS} accessibilityLayer margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="barangay" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatValue={(v) => fmt.number(Number(v))} />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="open" fill="var(--color-open)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} />
          <Bar dataKey="closed" fill="var(--color-closed)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
