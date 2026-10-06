import { DownloadIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useAiLog } from "@rcene/ai";
import { toCsv } from "@rcene/data";
import { useT } from "@rcene/i18n";
import { KpiRow, PageHeader } from "@rcene/kit/app";
import { resetDemo } from "@rcene/store";
import { downloadCsv, downloadText } from "@rcene/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@rcene/ui/components/alert-dialog";
import { Button } from "@rcene/ui/components/button";
import { SEED_COUNT, type RequestRecord } from "@/domain/records.ts";
import { AdminFrame } from "@/features/admin/AdminFrame.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

const CSV_COLUMNS = ["code", "barangay", "category", "priority", "channel", "households", "status", "receivedAt", "dueAt", "details"] as const;

/** /admin/data: what is in the demo store, exports, and the reset for rehearsals (AI settings, theme and language survive it). */
export function AdminData() {
  const t = useT(strings);
  const records = useRecords((s) => s.records);
  const clearLog = useAiLog((s) => s.clear);
  const filed = Math.max(0, records.length - SEED_COUNT);
  const withAi = records.filter((r) => r.triage).length;

  const exportJson = () => downloadText("requests.json", JSON.stringify(records, null, 2), "application/json");
  const exportCsv = () =>
    downloadCsv(
      "requests.csv",
      toCsv<RequestRecord>(
        records,
        CSV_COLUMNS.map((key) => ({ key, header: key })),
      ),
    );

  return (
    <AdminFrame>
      <PageHeader
        eyebrow={t("admin.title")}
        title={t("demodata.title")}
        description={t("demodata.lead")}
        breadcrumbs={[{ label: t("admin.title"), to: "/admin" }, { label: t("demodata.title") }]}
      />
      <div className="flex flex-col gap-6">
        <KpiRow
          columns={3}
          label={t("demodata.title")}
          items={[
            { id: "count", label: t("demodata.count"), value: records.length, countUp: true },
            { id: "filed", label: t("demodata.filed"), value: filed, countUp: true },
            { id: "ai", label: t("demodata.withAi"), value: withAi, countUp: true },
          ]}
        />
        <section aria-labelledby="data-export" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="data-export" className="mb-4 font-display text-lg font-semibold">
            {t("demodata.export")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <DownloadIcon aria-hidden="true" />
              {t("demodata.csv")}
            </Button>
            <Button variant="outline" onClick={exportJson}>
              <DownloadIcon aria-hidden="true" />
              {t("demodata.json")}
            </Button>
          </div>
        </section>
        <section aria-labelledby="data-reset" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="data-reset" className="font-display text-lg font-semibold">
            {t("demodata.resetTitle")}
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("demodata.resetLead")}</p>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <RotateCcwIcon aria-hidden="true" />
                  {t("demodata.reset")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("demodata.confirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("demodata.confirmBody")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("demodata.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resetDemo({ keep: ["lang", "theme"] })}>{t("demodata.confirm")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={clearLog}>
              <Trash2Icon aria-hidden="true" />
              {t("demodata.clearLog")}
            </Button>
          </div>
        </section>
      </div>
    </AdminFrame>
  );
}
