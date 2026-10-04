import { useId, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { toCsv, type CsvColumn } from "@rcene/data";
import { useFormat, useT } from "@rcene/i18n";
import { downloadCsv } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Input } from "@rcene/ui/components/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@rcene/ui/components/table";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";
import { IllustratedState } from "./illustrated-state.tsx";

declare module "@tanstack/react-table" {
  // Merged into TanStack's own ColumnMeta (the type parameters must match its declaration).
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Cell and header alignment in DataTable: "end" for numbers and money. */
    align?: "start" | "center" | "end";
  }
}

export interface DataTableSearch {
  placeholder?: string;
  /** Column ids to search (default: every column whose values are text or numbers). */
  columns?: string[];
}

export interface DataTableExport<T> {
  /** File name; ".csv" is added when missing. */
  filename: string;
  /** Columns of the file, with translated headers (see toCsv in @rcene/data). */
  columns: CsvColumn<T>[];
}

export interface DataTableProps<T> {
  /** TanStack Table 8 column definitions. Set `meta: { align: "end" }` for numbers. */
  columns: ColumnDef<T, any>[];
  data: T[];
  /** The table's name: shown as its title and given to screen readers as the <caption>. */
  caption: string;
  /** A text filter over the rows (true, or options). */
  search?: boolean | DataTableSearch;
  /** Rows per page (default 10). */
  pageSize?: number;
  /** Makes rows clickable and focusable (Enter or Space opens). */
  onRowActivate?: (row: T) => void;
  /** Adds a "Download CSV" button for the filtered, sorted rows (all pages). Text is formula-guarded. */
  exportCsv?: DataTableExport<T>;
  /** Shown when `data` is empty (default: a calm "No rows to show yet."). */
  empty?: ReactNode;
  /** Extra controls in the toolbar, e.g. a status filter. */
  toolbar?: ReactNode;
  getRowId?: (row: T, index: number) => string;
  className?: string;
}

const ALIGN = { start: "text-left", center: "text-center", end: "text-right" } as const;

/** Lower case without accents, so "Cañaveral" matches "canaveral". */
function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const INTERACTIVE = "a,button,input,select,textarea,label,[role=button],[role=checkbox],[role=link]";

/**
 * A complete data table on TanStack Table 8: sortable headers (aria-sort),
 * a text filter, pagination ("Page n of N"), row activation by click and
 * Enter, CSV export and empty / no-match states. Scrolls sideways on phones.
 */
export function DataTable<T>({
  columns,
  data,
  caption,
  search,
  pageSize = 10,
  onRowActivate,
  exportCsv,
  empty,
  toolbar,
  getRowId,
  className,
}: DataTableProps<T>) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const hintId = useId();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
  const searchOptions = typeof search === "object" ? search : undefined;
  const searchColumns = searchOptions?.columns;

  const globalFilterFn = useMemo<FilterFn<T>>(
    () => (row, columnId, filterValue: string) => {
      const value: unknown = row.getValue(columnId);
      if (value === null || value === undefined) return false;
      return fold(String(value)).includes(fold(filterValue.trim()));
    },
    [],
  );

  const table = useReactTable<T>({
    data,
    columns,
    state: { sorting, globalFilter: query, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: (updater) => setQuery((q) => (typeof updater === "function" ? updater(q) : String(updater ?? ""))),
    onPaginationChange: setPagination,
    globalFilterFn,
    // Without `search.columns`, TanStack's default applies: columns whose values are text or numbers.
    ...(searchColumns ? { getColumnCanGlobalFilter: (column: { id: string }) => searchColumns.includes(column.id) } : {}),
    sortDescFirst: false,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filtered = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(1, table.getPageCount());
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pageRows = table.getRowModel().rows;
  const from = filtered === 0 ? 0 : pageIndex * pagination.pageSize + 1;
  const to = filtered === 0 ? 0 : from + pageRows.length - 1;
  const columnCount = table.getVisibleLeafColumns().length;

  const onSearch = (value: string) => {
    setQuery(value);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const onExport = () => {
    if (!exportCsv) return;
    const rows = table.getPrePaginationRowModel().rows.map((r) => r.original);
    const name = /\.csv$/i.test(exportCsv.filename) ? exportCsv.filename : `${exportCsv.filename}.csv`;
    downloadCsv(name, toCsv(rows, exportCsv.columns, { bom: true }));
  };

  const activate = (row: T) => (event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) => {
    if (!onRowActivate) return;
    const target = event.target as HTMLElement;
    if (target !== event.currentTarget && target.closest(INTERACTIVE)) return;
    if ("key" in event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
    }
    onRowActivate(row);
  };

  return (
    <div
      data-slot="data-table"
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-raised", className)}
    >
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div className="min-w-0">
          {/* The <caption> carries the name for screen readers; this is its visible twin. */}
          <p aria-hidden="true" className="font-display text-lg leading-tight font-semibold">
            {caption}
          </p>
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground tabular-nums">
            {t("kit.table.showing", { from: fmt.number(from), to: fmt.number(to), total: fmt.number(filtered) })}
          </p>
        </div>
        {(search || exportCsv || toolbar) && (
          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => onSearch(e.target.value)}
                  aria-label={t("kit.table.search")}
                  placeholder={searchOptions?.placeholder ?? t("kit.table.searchPlaceholder")}
                  className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2"
                    onClick={() => onSearch("")}
                  >
                    <XIcon aria-hidden="true" />
                    <span className="sr-only">{t("kit.table.clearSearch")}</span>
                  </Button>
                )}
              </div>
            )}
            {toolbar}
            {exportCsv && (
              <Button type="button" variant="outline" onClick={onExport} disabled={filtered === 0}>
                <DownloadIcon aria-hidden="true" />
                {t("kit.table.download")}
              </Button>
            )}
          </div>
        )}
      </div>

      {onRowActivate && (
        <p id={hintId} className="sr-only">
          {t("kit.table.rowHint")}
        </p>
      )}
      <Table aria-describedby={onRowActivate ? hintId : undefined} className="tabular-nums">
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const align = header.column.columnDef.meta?.align ?? "start";
                const sorted = header.column.getIsSorted();
                const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                const SortIcon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ChevronsUpDownIcon;
                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className={cn(
                      "h-11 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:pl-5 last:pr-5",
                      ALIGN[align],
                    )}
                  >
                    {header.column.getCanSort() && !header.isPlaceholder ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 uppercase transition-colors hover:bg-accent hover:text-accent-foreground",
                          align === "end" && "flex-row-reverse",
                          sorted && "text-foreground",
                        )}
                      >
                        {content}
                        <SortIcon aria-hidden="true" className={cn("size-3.5 shrink-0", !sorted && "opacity-50")} />
                      </button>
                    ) : (
                      content
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="p-0 whitespace-normal">
                {data.length === 0 ? (
                  (empty ?? <IllustratedState spot="empty" size="sm" title={t("kit.table.empty")} />)
                ) : (
                  <IllustratedState
                    spot="search"
                    size="sm"
                    title={t("kit.table.noMatches", { query: query.trim() })}
                    actions={
                      <Button type="button" variant="outline" size="sm" onClick={() => onSearch("")}>
                        <XIcon aria-hidden="true" />
                        {t("kit.table.clearSearch")}
                      </Button>
                    }
                  />
                )}
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={onRowActivate ? 0 : undefined}
                onClick={onRowActivate ? activate(row.original) : undefined}
                onKeyDown={onRowActivate ? activate(row.original) : undefined}
                data-activatable={onRowActivate ? "" : undefined}
                className={cn(
                  onRowActivate &&
                    "cursor-pointer focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn("px-4 py-3 first:pl-5 last:pr-5", ALIGN[cell.column.columnDef.meta?.align ?? "start"])}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
          <p data-slot="data-table-page" className="text-sm font-medium tabular-nums">
            {t("kit.table.page", { n: fmt.number(pageIndex + 1), total: fmt.number(pageCount) })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t("kit.table.previous")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only sm:not-sr-only">{t("kit.table.next")}</span>
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
