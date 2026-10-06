import { StatTile, type StatTileProps } from "@rcene/ui";
import { cn } from "@rcene/ui/lib/utils";

export interface KpiItem extends StatTileProps {
  /** A stable key (defaults to the position). */
  id?: string;
}

export interface KpiRowProps {
  items: KpiItem[];
  /** Columns from lg up (default 4). Phones show two columns; a lone last tile spans both. */
  columns?: 2 | 3 | 4;
  /** Accessible name of the list, e.g. "Today at a glance". */
  label?: string;
  className?: string;
}

const COLUMNS = {
  2: "",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
} as const;

const LONE_LAST = {
  2: "[&>li:last-child:nth-child(odd)]:col-span-2",
  3: "[&>li:last-child:nth-child(odd)]:col-span-2 lg:[&>li:last-child:nth-child(odd)]:col-span-1",
  4: "[&>li:last-child:nth-child(odd)]:col-span-2 lg:[&>li:last-child:nth-child(odd)]:col-span-1",
} as const;

/** A responsive row of headline numbers (StatTile from @rcene/ui), as a list. */
export function KpiRow({ items, columns = 4, label, className }: KpiRowProps) {
  return (
    <ul
      data-slot="kpi-row"
      aria-label={label}
      className={cn("grid grid-cols-2 gap-3 sm:gap-4", COLUMNS[columns], LONE_LAST[columns], className)}
    >
      {items.map(({ id, className: tileClass, ...tile }, i) => (
        <li key={id ?? i} className="min-w-0">
          <StatTile {...tile} className={cn("h-full shadow-raised", tileClass)} />
        </li>
      ))}
    </ul>
  );
}
