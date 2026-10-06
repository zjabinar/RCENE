/**
 * Every request in a DataTable: sortable columns, a search over the text columns,
 * paging, rows that open the record (click, Enter or Space) and a CSV download of
 * the filtered, sorted rows. Labels are translated in the accessors, so search and
 * sort work on what the user reads; "Status" sorts in step order, not A–Z.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import type { CsvColumn } from "@rcene/data";
import { useFormat, useT } from "@rcene/i18n";
import { DataTable } from "@rcene/kit/app";
import { isOverdue } from "@/domain/kpis.ts";
import { STATUSES, newestFirst, type RequestRecord } from "@/domain/records.ts";
import { strings } from "@/i18n/strings.ts";
import { CategoryLabel, OverdueBadge, PriorityBadge, StatusBadge } from "./badges.tsx";

interface RequestsTableProps {
  records: readonly RequestRecord[];
  /** "Now" for the overdue flag (demoNow() in this app). */
  now: string;
  pageSize?: number;
  className?: string;
}

export function RequestsTable({ records, now, pageSize = 8, className }: RequestsTableProps) {
  const t = useT(strings);
  const fmt = useFormat();
  const navigate = useNavigate();
  const data = useMemo(() => newestFirst(records), [records]);

  const columns: ColumnDef<RequestRecord>[] = [
    {
      accessorKey: "code",
      header: t("col.code"),
      cell: ({ row }) => <span className="font-semibold whitespace-nowrap">{row.original.code}</span>,
    },
    {
      id: "category",
      accessorFn: (r) => t(`category.${r.category}`),
      header: t("col.category"),
      cell: ({ row }) => <CategoryLabel category={row.original.category} className="whitespace-nowrap" />,
    },
    { accessorKey: "barangay", header: t("col.barangay"), cell: ({ getValue }) => <span className="whitespace-nowrap">{String(getValue())}</span> },
    {
      id: "status",
      accessorFn: (r) => t(`record.status.${r.status}`),
      header: t("col.status"),
      sortingFn: (a, b) => STATUSES.indexOf(a.original.status) - STATUSES.indexOf(b.original.status),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "priority",
      accessorFn: (r) => t(`priority.${r.priority}`),
      header: t("col.priority"),
      cell: ({ row }) => <PriorityBadge urgent={row.original.priority === "urgent"} />,
    },
    {
      accessorKey: "receivedAt",
      header: t("col.received"),
      cell: ({ row }) => <span className="whitespace-nowrap">{fmt.date(new Date(row.original.receivedAt))}</span>,
    },
    {
      accessorKey: "dueAt",
      header: t("col.due"),
      cell: ({ row }) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          {fmt.date(new Date(row.original.dueAt))}
          {isOverdue(row.original, now) && <OverdueBadge />}
        </span>
      ),
    },
  ];

  // CSV: translated headers and labels, numbers as numbers, dates as ISO 8601.
  const csv: CsvColumn<RequestRecord>[] = [
    { key: "code", header: t("col.code") },
    { key: (r) => t(`category.${r.category}`), header: t("col.category") },
    { key: "barangay", header: t("col.barangay") },
    { key: (r) => t(`record.status.${r.status}`), header: t("col.status") },
    { key: (r) => t(`priority.${r.priority}`), header: t("col.priority") },
    { key: (r) => t(`channel.${r.channel}`), header: t("col.channel") },
    { key: "households", header: t("col.households") },
    { key: "receivedAt", header: t("col.received") },
    { key: "dueAt", header: t("col.due") },
    { key: "landmark", header: t("col.landmark") },
  ];

  return (
    <DataTable
      className={className}
      columns={columns}
      data={data}
      caption={t("table.caption")}
      search={{ placeholder: t("table.search"), columns: ["code", "category", "barangay", "status", "priority"] }}
      pageSize={pageSize}
      getRowId={(r) => r.code}
      onRowActivate={(r) => navigate(`/console/${r.code}`)}
      exportCsv={{ filename: t("table.file"), columns: csv }}
    />
  );
}
