/**
 * The AI on a request's page: what the triage suggested at filing (and whether the staff
 * kept it), and a drafted SMS update for the resident that a person reviews and sends.
 */
import { CopyIcon, SparklesIcon } from "lucide-react";
import { AiInsightCard, AiRunButton, AiThinking, SMS_LIMIT, draftTask, isProvider, useAiTask, useProviderName } from "@rcene/ai";
import { useFormat, useT } from "@rcene/i18n";
import { toast } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import type { RequestRecord } from "@/domain/records.ts";
import { draftInput } from "@/domain/triage.ts";
import { strings } from "@/i18n/strings.ts";

/** One line on how the request was triaged. */
export function TriageNote({ record }: { record: RequestRecord }) {
  const t = useT(strings);
  const fmt = useFormat();
  const name = useProviderName();
  const triage = record.triage;
  if (!triage) return <p className="text-sm text-muted-foreground">{t("detail.ai.none")}</p>;
  const provider = isProvider(triage.provider) ? name(triage.provider) : triage.provider;
  return (
    <p className="flex items-start gap-2 text-sm">
      <SparklesIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>
        {t("detail.ai.triage", {
          category: t(`category.${triage.category}`),
          priority: t(`priority.${triage.priority}`),
          pct: fmt.percent(triage.confidence),
          provider: [provider, triage.model].filter(Boolean).join(" · "),
        })}{" "}
        <strong className="font-semibold">{t(triage.decision === "accepted" ? "detail.ai.accepted" : "detail.ai.changed")}</strong>
      </span>
    </p>
  );
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error(text);
  }
}

/** "Draft with AI": an SMS (and a longer message) from the record's facts only. */
export function DraftUpdate({ record }: { record: RequestRecord }) {
  const t = useT(strings);
  const fmt = useFormat();
  const draft = useAiTask(draftTask);
  const run = () =>
    void draft.run(
      draftInput(record, {
        category: t(`category.${record.category}`),
        status: t(`record.status.${record.status}`),
        due: fmt.date(new Date(record.dueAt)),
        sender: t("detail.draft.sender"),
      }),
    );
  const result = draft.result;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("detail.draft.lead")}</p>
      <AiRunButton running={draft.running} onClick={run} label={t("detail.draft.run")} variant="outline" className="self-start" />
      {draft.running && <AiThinking />}
      {!draft.running && result && (
        <AiInsightCard
          headingLevel={3}
          title={t("detail.draft.title")}
          meta={result}
          footer={
            <Button type="button" onClick={() => void copy(result.data.sms, t("detail.draft.copied"))}>
              <CopyIcon aria-hidden="true" />
              {t("detail.draft.copy")}
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("detail.draft.sms", { n: fmt.number(result.data.sms.length), max: SMS_LIMIT })}
            </p>
            <p className="rounded-lg border bg-background p-3 text-base leading-relaxed">{result.data.sms}</p>
          </div>
          <details className="rounded-lg border px-4 py-2 text-sm">
            <summary className="cursor-pointer font-medium">{t("detail.draft.body")}</summary>
            <p className="mt-2 font-semibold">{result.data.subject}</p>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{result.data.body}</p>
          </details>
        </AiInsightCard>
      )}
    </div>
  );
}
