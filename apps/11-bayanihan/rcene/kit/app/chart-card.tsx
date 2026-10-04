import { useId, useState, type ReactNode } from "react";
import { ChartColumnIcon, InfoIcon, Table2Icon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { ToggleGroup, ToggleGroupItem } from "@rcene/ui/components/toggle-group";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface ChartTableData {
  /** Column headers, translated. */
  columns: string[];
  /** One array per row; numbers are formatted for the active language and right-aligned. */
  rows: (string | number)[][];
}

export type ChartView = "chart" | "table";

export interface ChartCardProps {
  title: string;
  description?: ReactNode;
  /** A short honesty note under the chart ("Sample data", "Straight-line distance", "Counts under 5 hidden"). */
  caveat?: ReactNode;
  /** The same numbers as a table: always in the page for screen readers, shown when the viewer picks "Table". */
  table: ChartTableData;
  /** The chart, e.g. <ChartContainer> from @rcene/ui/components/chart. */
  children: ReactNode;
  defaultView?: ChartView;
  /** Heading level of the title (default 2). */
  headingLevel?: 2 | 3 | 4;
  /** Extra controls in the header, left of the Chart/Table switch. */
  actions?: ReactNode;
  className?: string;
}

function decimals(n: number): number {
  if (Number.isInteger(n)) return 0;
  const part = String(n).split(".")[1] ?? "";
  return Math.min(part.length, 2);
}

/**
 * A chart in a card with a Chart / Table switch. The table (the "data as a
 * table too" rule) is always rendered: visually hidden while the chart shows,
 * so screen readers can read the numbers either way.
 */
export function ChartCard({
  title,
  description,
  caveat,
  table,
  children,
  defaultView = "chart",
  headingLevel = 2,
  actions,
  className,
}: ChartCardProps) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const titleId = useId();
  const [view, setView] = useState<ChartView>(defaultView);
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <section
      data-slot="chart-card"
      data-view={view}
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-raised sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <Heading id={titleId} className="font-display text-lg leading-tight font-semibold">
            {title}
          </Heading>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={view}
            onValueChange={(v) => {
              if (v === "chart" || v === "table") setView(v);
            }}
            aria-label={t("kit.chart.view")}
          >
            <ToggleGroupItem value="chart" className="gap-1.5 px-3">
              <ChartColumnIcon aria-hidden="true" />
              {t("kit.chart.chart")}
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="gap-1.5 px-3">
              <Table2Icon aria-hidden="true" />
              {t("kit.chart.table")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {view === "chart" && (
        <div data-slot="chart-card-chart" className="min-w-0">
          {children}
        </div>
      )}

      <div
        data-slot="chart-card-table"
        className={cn(view === "chart" ? "sr-only" : "overflow-x-auto rounded-lg border")}
      >
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-muted/50">
            <tr>
              {table.columns.map((col, i) => (
                <th
                  key={`${col}-${i}`}
                  scope="col"
                  className={cn(
                    "h-10 px-4 text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase",
                    i === 0 ? "text-left" : "text-right",
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="border-t">
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="px-4 py-2.5 text-left font-medium">
                      {typeof cell === "number" ? fmt.number(cell, decimals(cell)) : cell}
                    </th>
                  ) : (
                    <td key={c} className={cn("px-4 py-2.5", typeof cell === "number" ? "text-right" : "text-left")}>
                      {typeof cell === "number" ? fmt.number(cell, decimals(cell)) : cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caveat && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0">
            <span className="mr-1.5 font-semibold text-foreground">{t("kit.chart.note")}</span>
            {caveat}
          </p>
        </div>
      )}
    </section>
  );
}
