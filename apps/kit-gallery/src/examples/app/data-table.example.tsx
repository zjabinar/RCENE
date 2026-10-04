import { useState } from "react";
import { CircleCheckIcon, CircleDotIcon, CircleIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { DataTable, type DataTableProps } from "@rcene/kit/app";
import { cn } from "@rcene/ui/lib/utils";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "DataTable",
  summary: {
    en: "Records in a sortable, searchable, paged table with row opening and a formula-safe CSV download.",
    war: "Mga rekord ha talaan nga mahahan-ay, mabibilngan ngan may pahina, nabubuksan an linya, ngan may CSV nga download.",
    fil: "Mga rekord sa talahanayang nasosort, nahahanap at may pahina, nabubuksan ang hilera, at may CSV na download.",
  },
  blocks: ["DataTable"],
  order: 30,
  frameHeight: 900,
};

const strings = {
  en: {
    caption: "Requests this week",
    code: "Code",
    barangay: "Barangay",
    type: "Type",
    filed: "Filed",
    status: "Status",
    open: "Open",
    progress: "In progress",
    done: "Done",
    water: "Water supply",
    road: "Road repair",
    waste: "Waste pickup",
    light: "Streetlight",
    drainage: "Drainage",
    search: "Code, barangay or type…",
    picked: "Opened {code}: {type}, {status}.",
    pickHint: "Click a row or press Enter on it to open the request.",
  },
  war: {
    caption: "Mga hangyo yana nga semana",
    code: "Code",
    type: "Klase",
    filed: "Ginsumite",
    status: "Kahimtang",
    open: "Bukas",
    progress: "Ginbubuhat",
    done: "Human na",
    water: "Suplay han tubig",
    road: "Pag-ayad han dalan",
    waste: "Pagkuha han basura",
    light: "Suga ha dalan",
    drainage: "Kanal",
    search: "Code, barangay o klase…",
    picked: "Gin-abri an {code}: {type}, {status}.",
    pickHint: "Pinduta an linya o i-Enter basi ablihon an hangyo.",
  },
  fil: {
    caption: "Mga kahilingan ngayong linggo",
    code: "Code",
    type: "Uri",
    filed: "Isinumite",
    status: "Katayuan",
    open: "Bukas",
    progress: "Kasalukuyan",
    done: "Tapos na",
    water: "Suplay ng tubig",
    road: "Pagkumpuni ng kalsada",
    waste: "Pagkuha ng basura",
    light: "Ilaw sa kalye",
    drainage: "Kanal",
    search: "Code, barangay o uri…",
    picked: "Binuksan ang {code}: {type}, {status}.",
    pickHint: "I-click ang hilera o pindutin ang Enter para buksan ang kahilingan.",
  },
};

type RequestType = "water" | "road" | "waste" | "light" | "drainage";
type RequestStatus = "open" | "progress" | "done";

interface Request {
  code: string;
  barangay: string;
  type: RequestType;
  filed: Date;
  status: RequestStatus;
}

const TYPES: RequestType[] = ["water", "road", "waste", "light", "drainage"];
const STATUSES: RequestStatus[] = ["open", "progress", "done"];
const START = new Date("2026-10-01T08:00:00+08:00").getTime();

/** 24 synthetic requests: codes only, fixed dates, the same every run. */
const REQUESTS: Request[] = Array.from({ length: 24 }, (_, i) => ({
  code: `REC-${String(i + 1).padStart(4, "0")}`,
  barangay: `BRGY-${String(((i * 7) % 12) + 1).padStart(2, "0")}`,
  type: TYPES[(i * 3) % TYPES.length]!,
  filed: new Date(START + i * 5.5 * 3_600_000),
  status: STATUSES[(i * 2 + Math.floor(i / 5)) % 3]!,
}));

const STATUS_ICON = { open: CircleIcon, progress: CircleDotIcon, done: CircleCheckIcon } as const;

export function Example() {
  const t = useT(strings);
  const fmt = useFormat();
  const [picked, setPicked] = useState<Request | null>(null);

  const columns: DataTableProps<Request>["columns"] = [
    { accessorKey: "code", header: t("code"), cell: (c) => <span className="font-semibold">{c.getValue<string>()}</span> },
    { accessorKey: "barangay", header: t("barangay") },
    { id: "type", accessorFn: (r) => t(r.type), header: t("type") },
    {
      accessorKey: "filed",
      header: t("filed"),
      cell: (c) => {
        const d = c.getValue<Date>();
        return (
          <time dateTime={d.toISOString()} className="text-muted-foreground">
            {fmt.date(d)} · {fmt.time(d)}
          </time>
        );
      },
    },
    {
      id: "status",
      accessorFn: (r) => t(r.status),
      header: t("status"),
      cell: (c) => {
        const status = c.row.original.status;
        const Icon = STATUS_ICON[status];
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              status === "open" && "bg-secondary text-secondary-foreground",
              status === "progress" && "bg-primary/10 text-primary",
              status === "done" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            {c.getValue<string>()}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={columns}
        data={REQUESTS}
        caption={t("caption")}
        search={{ placeholder: t("search"), columns: ["code", "barangay", "type", "status"] }}
        pageSize={8}
        onRowActivate={setPicked}
        exportCsv={{
          filename: "requests-brgy",
          columns: [
            { key: "code", header: t("code") },
            { key: "barangay", header: t("barangay") },
            { key: (r) => t(r.type), header: t("type") },
            { key: "filed", header: t("filed") },
            { key: (r) => t(r.status), header: t("status") },
          ],
        }}
      />
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {picked ? t("picked", { code: picked.code, type: t(picked.type), status: t(picked.status) }) : t("pickHint")}
      </p>
    </div>
  );
}
