/**
 * Recharts, themed: series colours come from CSS variables, so a chart follows
 * the palette and light/dark mode with no re-render.
 *
 *   const config = {
 *     evacuees: { label: t("chart.evacuees"), color: "var(--chart-1)" },
 *     capacity: { label: t("chart.capacity"), color: "var(--chart-2)" },
 *   } satisfies ChartConfig;
 *   <ChartContainer config={config} className="h-64">
 *     <BarChart data={rows} accessibilityLayer>
 *       <CartesianGrid vertical={false} />
 *       <XAxis dataKey="barangay" />
 *       <Bar dataKey="evacuees" fill="var(--color-evacuees)" isAnimationActive={!reduced} />
 *       <ChartTooltip content={<ChartTooltipContent />} />
 *     </BarChart>
 *   </ChartContainer>
 *
 * Each config key becomes --color-<key> inside the container. Use --chart-1..5
 * for categories, --seq-1..5 for an ordered scale, and the --level-* tokens only
 * for hazard levels. Always give the data as a table too (ChartCard in
 * @rcene/kit/app has a chart/table switch).
 */
import { createContext, useContext, useId, type ComponentProps, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "../../lib/utils.ts";

export type ChartConfig = Record<string, { label: ReactNode; color?: string }>;

const ChartContext = createContext<ChartConfig | null>(null);

function useChartConfig(): ChartConfig {
  const config = useContext(ChartContext);
  if (!config) throw new Error("Chart parts must be used inside <ChartContainer>");
  return config;
}

export interface ChartContainerProps extends Omit<ComponentProps<"div">, "children"> {
  config: ChartConfig;
  /** One Recharts chart element (BarChart, LineChart, …). */
  children: ReactElement;
}

/** Sizes the chart to its box (give it a height) and sets --color-<key> for each series. */
function ChartContainer({ config, className, style, children, ...props }: ChartContainerProps) {
  const id = useId();
  const vars = Object.fromEntries(
    Object.entries(config)
      .filter(([, item]) => item.color)
      .map(([key, item]) => [`--color-${key}`, item.color]),
  ) as CSSProperties;
  return (
    <ChartContext value={config}>
      <div
        data-slot="chart"
        data-chart={id}
        className={cn(
          "aspect-video w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70 [&_.recharts-reference-line_line]:stroke-border [&_.recharts-surface]:outline-none",
          className,
        )}
        style={{ ...vars, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext>
  );
}

const ChartTooltip = Tooltip;
const ChartLegend = Legend;

interface TooltipItem {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  dataKey?: string | number | ((obj: unknown) => unknown);
  color?: string;
}

export interface ChartTooltipContentProps {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: ReactNode;
  /** Format each value (e.g. useFormat().number). */
  formatValue?: (value: number | string) => string;
  hideLabel?: boolean;
  className?: string;
}

/** Tooltip body: the label, then one row per series with its colour, name and value. */
function ChartTooltipContent({ active, payload, label, formatValue, hideLabel = false, className }: ChartTooltipContentProps) {
  const config = useChartConfig();
  if (!active || !payload?.length) return null;
  return (
    <div className={cn("grid min-w-32 gap-1.5 rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-overlay", className)}>
      {!hideLabel && label !== undefined && <div className="font-medium">{label}</div>}
      <ul className="grid gap-1">
        {payload.map((item, i) => {
          const key = typeof item.dataKey === "string" || typeof item.dataKey === "number" ? String(item.dataKey) : String(item.name ?? i);
          const entry = config[key];
          const raw = Array.isArray(item.value) ? item.value.join("–") : item.value;
          return (
            <li key={key} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color ?? `var(--color-${key})` }} />
              <span className="text-muted-foreground">{entry?.label ?? item.name}</span>
              <span className="ml-auto font-mono font-medium tabular-nums">
                {raw === undefined ? "" : formatValue ? formatValue(raw as number | string) : String(raw)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface LegendItem {
  value?: string | number;
  dataKey?: string | number | ((obj: unknown) => unknown);
  color?: string;
}

export interface ChartLegendContentProps {
  payload?: readonly LegendItem[];
  className?: string;
}

/** Legend with the config labels, colour + text for every series. */
function ChartLegendContent({ payload, className }: ChartLegendContentProps) {
  const config = useChartConfig();
  if (!payload?.length) return null;
  return (
    <ul className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 text-xs", className)}>
      {payload.map((item, i) => {
        const key = typeof item.dataKey === "string" || typeof item.dataKey === "number" ? String(item.dataKey) : String(item.value ?? i);
        return (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color ?? `var(--color-${key})` }} />
            {config[key]?.label ?? item.value}
          </li>
        );
      })}
    </ul>
  );
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent };
