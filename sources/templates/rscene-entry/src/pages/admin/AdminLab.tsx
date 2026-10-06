import { useId, useState, type ReactNode } from "react";
import {
  AiInsightCard,
  AiProviderChip,
  AiRunButton,
  AiThinking,
  answerTask,
  briefTask,
  classifyTask,
  draftTask,
  extractTask,
  useAiTask,
  type AiResult,
} from "@rcene/ai";
import { useFormat, useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { Input } from "@rcene/ui/components/input";
import { Label } from "@rcene/ui/components/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rcene/ui/components/tabs";
import { Textarea } from "@rcene/ui/components/textarea";
import { LAB_DOCUMENTS, LAB_DRAFT_FACTS, LAB_DRAFT_PURPOSE, LAB_EXTRACT_FIELDS, LAB_EXTRACT_TEXT, LAB_QUESTION, LAB_TRIAGE_TEXT } from "@/content/lab.ts";
import { demoNow } from "@/domain/time.ts";
import { briefInput, triageInput } from "@/domain/triage.ts";
import { AdminFrame } from "@/features/admin/AdminFrame.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

/** The validated answer as JSON, folded: what the judges ask to see. */
function Json({ result }: { result: AiResult<unknown> }) {
  const t = useT(strings);
  return (
    <details className="rounded-lg border bg-background/60 px-4 py-2 text-sm">
      <summary className="cursor-pointer font-medium">{t("lab.json")}</summary>
      <pre className="mt-2 max-h-80 overflow-auto text-xs leading-relaxed whitespace-pre-wrap">{JSON.stringify(result.data, null, 2)}</pre>
    </details>
  );
}

function Field({ label, children, id }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function TriageLab() {
  const t = useT(strings);
  const id = useId();
  const [text, setText] = useState(LAB_TRIAGE_TEXT);
  const task = useAiTask(classifyTask);
  const result = task.result;
  return (
    <div className="flex flex-col gap-4">
      <Field id={id} label={t("lab.triage.input")}>
        <Textarea id={id} rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <AiRunButton
        className="self-start"
        running={task.running}
        disabled={text.trim().length < 8}
        onClick={() => void task.run(triageInput(text, (c) => t(`category.${c}`), (p) => t(`priority.${p}`)))}
      />
      {task.running && <AiThinking />}
      {!task.running && result && (
        <AiInsightCard
          headingLevel={3}
          label={
            <span className="rounded-full border px-2.5 py-0.5 text-sm font-medium">
              {result.data.category} · {result.data.priority}
            </span>
          }
          confidence={result.data.confidence}
          summary={result.data.summary}
          findings={result.data.key_findings}
          actions={result.data.recommended_actions}
          rationale={result.data.rationale}
          meta={result}
        >
          <Json result={result} />
        </AiInsightCard>
      )}
    </div>
  );
}

function BriefLab() {
  const t = useT(strings);
  const id = useId();
  const records = useRecords((s) => s.records);
  const [focus, setFocus] = useState("");
  const task = useAiTask(briefTask);
  const result = task.result;
  const run = () => {
    const input = briefInput(records, demoNow(), {
      title: t("brief.subject"),
      audience: t("brief.audience"),
      facts: { open: t("brief.fact.open"), due: t("brief.fact.due"), overdue: t("brief.fact.overdue"), done: t("brief.fact.done"), average: t("brief.fact.average") },
      category: (c) => t(`category.${c}`),
      priority: (p) => t(`priority.${p}`),
      status: (s) => t(`record.status.${s}`),
    });
    void task.run(focus.trim() ? { ...input, focus: focus.trim() } : input);
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("lab.brief.hint")}</p>
      <Field id={id} label={t("lab.brief.focus")}>
        <Input id={id} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder={t("lab.brief.focusPlaceholder")} />
      </Field>
      <AiRunButton className="self-start" running={task.running} onClick={run} />
      {task.running && <AiThinking />}
      {!task.running && result && (
        <AiInsightCard
          headingLevel={3}
          title={result.data.headline}
          confidence={result.data.confidence}
          summary={result.data.summary}
          findings={result.data.key_findings}
          risks={result.data.risks}
          actions={result.data.recommended_actions}
          meta={result}
        >
          <Json result={result} />
        </AiInsightCard>
      )}
    </div>
  );
}

function ExtractLab() {
  const t = useT(strings);
  const id = useId();
  const [text, setText] = useState(LAB_EXTRACT_TEXT);
  const task = useAiTask(extractTask);
  const result = task.result;
  return (
    <div className="flex flex-col gap-4">
      <Field id={id} label={t("lab.extract.input")}>
        <Textarea id={id} rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <p className="text-sm text-muted-foreground">{t("lab.extract.fields", { fields: LAB_EXTRACT_FIELDS.map((f) => f.label).join(", ") })}</p>
      <AiRunButton className="self-start" running={task.running} disabled={!text.trim()} onClick={() => void task.run({ text, fields: LAB_EXTRACT_FIELDS })} />
      {task.running && <AiThinking />}
      {!task.running && result && (
        <AiInsightCard headingLevel={3} confidence={result.data.confidence} rationale={result.data.notes} meta={result}>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {LAB_EXTRACT_FIELDS.map((f) => (
              <div key={f.id} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="font-medium break-words">{result.data.values[f.id] === null ? t("lab.none") : String(result.data.values[f.id])}</dd>
              </div>
            ))}
          </dl>
          {result.data.missing.length > 0 && <p className="text-sm text-muted-foreground">{t("lab.missing", { fields: result.data.missing.join(", ") })}</p>}
          <Json result={result} />
        </AiInsightCard>
      )}
    </div>
  );
}

function DraftLab() {
  const t = useT(strings);
  const fmt = useFormat();
  const purposeId = useId();
  const factsId = useId();
  const [purpose, setPurpose] = useState(LAB_DRAFT_PURPOSE);
  const [facts, setFacts] = useState(LAB_DRAFT_FACTS.join("\n"));
  const task = useAiTask(draftTask);
  const result = task.result;
  const run = () =>
    void task.run({
      kind: "notice",
      audience: t("lab.draft.audience"),
      purpose,
      facts: facts.split("\n").map((f) => f.trim()).filter(Boolean),
      sender: t("detail.draft.sender"),
    });
  return (
    <div className="flex flex-col gap-4">
      <Field id={purposeId} label={t("lab.draft.purpose")}>
        <Input id={purposeId} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </Field>
      <Field id={factsId} label={t("lab.draft.facts")}>
        <Textarea id={factsId} rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} />
      </Field>
      <AiRunButton className="self-start" running={task.running} disabled={!purpose.trim()} onClick={run} />
      {task.running && <AiThinking />}
      {!task.running && result && (
        <AiInsightCard headingLevel={3} title={result.data.subject} meta={result}>
          <p className="whitespace-pre-line">{result.data.body}</p>
          <p className="rounded-lg border bg-background p-3 text-sm">
            <span className="font-semibold">{t("detail.draft.sms", { n: fmt.number(result.data.sms.length), max: 160 })}: </span>
            {result.data.sms}
          </p>
          <Json result={result} />
        </AiInsightCard>
      )}
    </div>
  );
}

function AnswerLab() {
  const t = useT(strings);
  const id = useId();
  const [question, setQuestion] = useState(LAB_QUESTION);
  const task = useAiTask(answerTask);
  const result = task.result;
  return (
    <div className="flex flex-col gap-4">
      <Field id={id} label={t("lab.answer.question")}>
        <Input id={id} value={question} onChange={(e) => setQuestion(e.target.value)} />
      </Field>
      <details className="rounded-lg border px-4 py-2 text-sm">
        <summary className="cursor-pointer font-medium">{t("lab.answer.docs", { n: LAB_DOCUMENTS.length })}</summary>
        <ul className="mt-2 flex flex-col gap-2">
          {LAB_DOCUMENTS.map((d) => (
            <li key={d.id}>
              <span className="font-semibold">
                [{d.id}] {d.title}
              </span>
              <span className="block text-muted-foreground">{d.text}</span>
            </li>
          ))}
        </ul>
      </details>
      <AiRunButton className="self-start" running={task.running} disabled={!question.trim()} onClick={() => void task.run({ question, documents: LAB_DOCUMENTS })} />
      {task.running && <AiThinking />}
      {!task.running && result && (
        <AiInsightCard
          headingLevel={3}
          confidence={result.data.confidence}
          summary={result.data.answer}
          findings={result.data.follow_up}
          findingsTitle={t("lab.answer.followUp")}
          meta={result}
        >
          <p className="text-sm text-muted-foreground">{t("lab.citations", { ids: result.data.citations.join(", ") || t("lab.none") })}</p>
          <Json result={result} />
        </AiInsightCard>
      )}
    </div>
  );
}

const TABS = [
  { id: "triage", panel: TriageLab },
  { id: "brief", panel: BriefLab },
  { id: "extract", panel: ExtractLab },
  { id: "draft", panel: DraftLab },
  { id: "answer", panel: AnswerLab },
] as const;

/** /admin/lab: every generic AI task on sample inputs, with the provider chosen on /admin/ai and the validated JSON. */
export function AdminLab() {
  const t = useT(strings);
  return (
    <AdminFrame>
      <PageHeader
        eyebrow={t("admin.title")}
        title={t("lab.title")}
        description={t("lab.lead")}
        breadcrumbs={[{ label: t("admin.title"), to: "/admin" }, { label: t("lab.title") }]}
        actions={<AiProviderChip to="/admin/ai" />}
      />
      <Tabs defaultValue="triage" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          {TABS.map(({ id }) => (
            <TabsTrigger key={id} value={id}>
              {t(`lab.tab.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ id, panel: Panel }) => (
          <TabsContent key={id} value={id} className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
            <Panel />
          </TabsContent>
        ))}
      </Tabs>
    </AdminFrame>
  );
}
