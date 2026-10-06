/**
 * "AI briefing" on the console overview: a short brief for the head of office from the
 * KPIs the app computed and the open requests. The numbers come from the app; the AI
 * only reads them (and the demo rules quote them), so nothing in the brief is invented.
 */
import { AiInsightCard, AiProviderChip, AiRunButton, AiThinking, briefTask, useAiTask } from "@rcene/ai";
import { useT } from "@rcene/i18n";
import type { RequestRecord } from "@/domain/records.ts";
import { briefInput } from "@/domain/triage.ts";
import { strings } from "@/i18n/strings.ts";

export function AiBriefing({ records, now }: { records: readonly RequestRecord[]; now: string }) {
  const t = useT(strings);
  const brief = useAiTask(briefTask);
  const run = () =>
    void brief.run(
      briefInput(records, now, {
        title: t("brief.subject"),
        audience: t("brief.audience"),
        facts: {
          open: t("brief.fact.open"),
          due: t("brief.fact.due"),
          overdue: t("brief.fact.overdue"),
          done: t("brief.fact.done"),
          average: t("brief.fact.average"),
        },
        category: (c) => t(`category.${c}`),
        priority: (p) => t(`priority.${p}`),
        status: (s) => t(`record.status.${s}`),
      }),
    );
  const result = brief.result;

  return (
    <section aria-labelledby="brief-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="brief-heading" className="font-display text-lg font-semibold">
          {t("brief.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("brief.lead")}</p>
        <AiProviderChip to="/admin/ai" />
      </div>
      <AiRunButton running={brief.running} onClick={run} label={result ? t("brief.rerun") : t("brief.run")} className="self-start" />
      {brief.running && <AiThinking />}
      {!brief.running && result && (
        <AiInsightCard
          headingLevel={3}
          title={result.data.headline}
          confidence={result.data.confidence}
          summary={result.data.summary}
          findings={result.data.key_findings}
          risks={result.data.risks}
          actions={result.data.recommended_actions}
          meta={result}
        />
      )}
    </section>
  );
}
