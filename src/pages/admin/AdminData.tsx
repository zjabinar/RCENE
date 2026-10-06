import { DownloadIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useAiLog } from "@rcene/ai";
import { useFormat, useT } from "@rcene/i18n";
import { KpiRow, PageHeader } from "@rcene/kit/app";
import { resetDemo } from "@rcene/store";
import { downloadText } from "@rcene/ui";
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
import { AdminFrame } from "@/features/admin/AdminFrame.tsx";
import { strings } from "@/i18n/strings.ts";
import { useSpine } from "@/store.ts";

/** /admin/data: the shared spine state, exports, and the reset for rehearsals (AI settings, theme and language survive it). */
export function AdminData() {
  const t = useT(strings);
  const fmt = useFormat();
  const updatedAt = useSpine((s) => s.updatedAt);
  const log = useAiLog((s) => s.entries);
  const clearLog = useAiLog((s) => s.clear);

  const exportSpine = () => downloadText("andam-spine.json", JSON.stringify(useSpine.getState(), null, 2), "application/json");
  const exportLog = () => downloadText("andam-ai-log.json", JSON.stringify(log, null, 2), "application/json");

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
          columns={2}
          label={t("demodata.title")}
          items={[
            { id: "updated", label: t("demodata.updated"), value: updatedAt ? fmt.time(updatedAt) : t("demodata.never") },
            { id: "runs", label: t("admin.kpi.runs"), value: log.length, countUp: true },
          ]}
        />
        <section aria-labelledby="data-export" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="data-export" className="mb-4 font-display text-lg font-semibold">
            {t("demodata.export")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportSpine}>
              <DownloadIcon aria-hidden="true" />
              {t("demodata.json")}
            </Button>
            <Button variant="outline" onClick={exportLog}>
              <DownloadIcon aria-hidden="true" />
              {t("demodata.log")}
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
