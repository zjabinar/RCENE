import { KeyRoundIcon } from "lucide-react";
import { AiActivityLog, AiSettingsPanel } from "@rcene/ai";
import { useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { AdminFrame } from "@/features/admin/AdminFrame.tsx";
import { strings } from "@/i18n/strings.ts";

/** /admin/ai: who answers the AI features (demo rules, OpenAI, Claude, Gemini, a local model), a connection test and the activity log. */
export function AdminAi() {
  const t = useT(strings);
  return (
    <AdminFrame
      asideLabel={t("adminAi.keys.title")}
      aside={
        <section aria-labelledby="keys-heading" className="flex flex-col gap-3">
          <h2 id="keys-heading" className="flex items-center gap-2 font-display text-lg font-semibold">
            <KeyRoundIcon aria-hidden="true" className="size-5 text-primary" />
            {t("adminAi.keys.title")}
          </h2>
          <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm">
            <li>{t("adminAi.keys.1")}</li>
            <li>{t("adminAi.keys.2")}</li>
            <li>{t("adminAi.keys.3")}</li>
            <li>{t("adminAi.keys.4")}</li>
          </ol>
          <p className="text-sm text-muted-foreground">{t("adminAi.keys.note")}</p>
        </section>
      }
    >
      <PageHeader
        eyebrow={t("admin.title")}
        title={t("adminAi.title")}
        description={t("adminAi.lead")}
        breadcrumbs={[{ label: t("admin.title"), to: "/admin" }, { label: t("adminAi.title") }]}
      />
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ai-settings" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="ai-settings" className="mb-4 font-display text-lg font-semibold">
            {t("adminAi.settings")}
          </h2>
          <AiSettingsPanel />
        </section>
        <section aria-labelledby="ai-activity" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
          <h2 id="ai-activity" className="font-display text-lg font-semibold">
            {t("adminAi.activity")}
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("adminAi.activityLead")}</p>
          <AiActivityLog />
        </section>
      </div>
    </AdminFrame>
  );
}
