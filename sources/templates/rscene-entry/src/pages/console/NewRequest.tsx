import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, ClipboardPasteIcon, SparklesIcon } from "lucide-react";
import { z } from "zod";
import { AiInsightCard, AiProviderChip, AiRunButton, AiThinking, classifyTask, useAiTask } from "@rcene/ai";
import { useLayer } from "@rcene/data";
import { useFormat, useT } from "@rcene/i18n";
import {
  BarangayField,
  CheckboxField,
  NumberField,
  PageHeader,
  RadioField,
  SelectField,
  TextareaField,
  TextField,
  Wizard,
  useKitZodErrors,
  useWizard,
  type WizardStep,
} from "@rcene/kit/app";
import { LoadGate, toast } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Form } from "@rcene/ui/components/form";
import { CATEGORIES, CHANNELS, PRIORITIES, nextCode, type TriageInfo } from "@/domain/records.ts";
import { demoNow } from "@/domain/time.ts";
import { SAMPLE_REPORTS, triageDecision, triageInput, triageSuggestion } from "@/domain/triage.ts";
import { ConsoleFrame } from "@/features/console/ConsoleFrame.tsx";
import { CategoryLabel, PriorityBadge } from "@/features/requests/badges.tsx";
import { fill } from "@/i18n/fill.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

/**
 * The form's rules. Messages come from the kit's zod error map (useKitZodErrors), in the
 * active language. `confirmed` is checked by the wizard: Finish stays unavailable until it is ticked.
 */
const schema = z.object({
  details: z.string().max(600),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  channel: z.enum(CHANNELS),
  barangay: z.string().min(1),
  households: z.int().min(1).max(500),
  landmark: z.string().max(80),
  confirmed: z.boolean(),
});

type Values = z.output<typeof schema>;
type Suggestion = Omit<TriageInfo, "decision">;

/** The fields each step validates before Next moves on. */
const STEP_FIELDS = [
  ["details"],
  ["category", "priority", "channel"],
  ["barangay", "households", "landmark"],
  ["confirmed"],
] as const satisfies readonly (readonly (keyof Values)[])[];

/** The shortest report worth sending to the AI. */
const MIN_TEXT = 8;

/**
 * /console/new: file a request in four steps. Step 1 takes the resident's own words and
 * offers AI triage (a suggested category, priority, summary and next actions); the staff
 * apply it or not, and can still change every field. What the AI suggested, and whether
 * it was kept, is filed with the record.
 */
export function NewRequest() {
  const t = useT(strings);
  const fmt = useFormat();
  const navigate = useNavigate();
  const records = useRecords((s) => s.records);
  const add = useRecords((s) => s.add);
  const barangays = useLayer("barangays");
  const barangayNames = useMemo(
    () =>
      barangays.status === "ready"
        ? barangays.data.features.map((f) => f.properties.name).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        : [],
    [barangays],
  );
  const errors = useKitZodErrors();
  const code = nextCode(records);
  const triage = useAiTask(classifyTask);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [sample, setSample] = useState(0);

  const form = useForm({
    resolver: zodResolver(schema, { error: errors.map }),
    defaultValues: { details: "", priority: "normal", channel: "walkIn", barangay: "", landmark: "", confirmed: false },
    mode: "onTouched",
  });
  const confirmed = useWatch({ control: form.control, name: "confirmed" });
  const details = useWatch({ control: form.control, name: "details" }) ?? "";

  const steps: WizardStep[] = [
    { id: "describe", title: t("new.step.describe"), description: t("new.step.describeHint") },
    { id: "request", title: t("new.step.request"), description: t("new.step.requestHint") },
    { id: "place", title: t("new.step.place"), description: t("new.step.placeHint") },
    { id: "review", title: t("new.step.review"), description: t("new.step.reviewHint") },
  ];
  const wizard = useWizard(steps.length);

  /** Next validates the current step first; Back and the finished steps in the stepper just move. */
  const changeStep = async (index: number) => {
    if (index > wizard.current) {
      const valid = await form.trigger([...STEP_FIELDS[wizard.current]!], { shouldFocus: true });
      if (!valid) return;
    }
    wizard.goTo(index);
  };

  const suggest = () =>
    void triage.run(
      triageInput(
        details.trim(),
        (c) => t(`category.${c}`),
        (p) => t(`priority.${p}`),
      ),
    );

  const fillSample = () => {
    form.setValue("details", SAMPLE_REPORTS[sample % SAMPLE_REPORTS.length]!, { shouldDirty: true });
    setSample((n) => n + 1);
    triage.reset();
  };

  const apply = () => {
    if (!triage.result) return;
    const next = triageSuggestion(triage.result);
    if (!next) return;
    setSuggestion(next);
    form.setValue("category", next.category, { shouldValidate: true });
    form.setValue("priority", next.priority, { shouldValidate: true });
    toast.success(t("new.ai.applied"));
    wizard.goTo(1);
  };

  const save = ({ confirmed: _confirmed, ...draft }: Values) => {
    const record = add({ ...draft, ...(suggestion && { triage: triageDecision(suggestion, draft) }) }, demoNow());
    toast.success(t("new.saved", { code: record.code }), { description: t("new.savedHint") });
    navigate(`/console/${record.code}`);
  };

  /** If anything is still invalid on Finish, go back to the first step that has the error. */
  const finish = () =>
    void form.handleSubmit(save, (invalid) => {
      const step = STEP_FIELDS.findIndex((fields) => fields.some((f) => f in invalid));
      if (step >= 0) wizard.goTo(step);
    })();

  const result = triage.result;
  const proposal = result ? triageSuggestion(result) : null;

  return (
    <ConsoleFrame aside={<AfterFiling code={code} />} asideLabel={t("new.aside.title")}>
      <PageHeader
        eyebrow={t("console.title")}
        title={t("new.title")}
        description={t("new.lead")}
        breadcrumbs={[{ label: t("console.title"), to: "/console" }, { label: t("new.title") }]}
        actions={<AiProviderChip to="/admin/ai" />}
      />
      <Form {...form}>
        <form noValidate onSubmit={(e) => e.preventDefault()} className="max-w-3xl">
          <Wizard
            steps={steps}
            current={wizard.current}
            onStepChange={(i) => void changeStep(i)}
            onFinish={finish}
            canNext={!wizard.isLast || confirmed}
            blockedReason={t("new.confirmFirst")}
            finishLabel={t("new.finish")}
          >
            {wizard.current === 0 && (
              <div className="grid gap-5">
                <TextareaField
                  control={form.control}
                  name="details"
                  label={t("field.details")}
                  description={t("field.detailsHint")}
                  maxLength={600}
                  rows={5}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <AiRunButton running={triage.running} onClick={suggest} disabled={details.trim().length < MIN_TEXT} label={t("new.ai.suggest")} />
                  <Button type="button" variant="outline" onClick={fillSample}>
                    <ClipboardPasteIcon aria-hidden="true" />
                    {t("new.ai.sample")}
                  </Button>
                </div>
                {details.trim().length < MIN_TEXT && <p className="text-sm text-muted-foreground">{t("new.ai.needText")}</p>}
                {triage.running && <AiThinking />}
                {!triage.running && result && (
                  <AiInsightCard
                    headingLevel={3}
                    title={t("new.ai.title")}
                    label={
                      proposal && (
                        <>
                          <CategoryLabel category={proposal.category} className="font-semibold" />
                          <PriorityBadge urgent={proposal.priority === "urgent"} />
                        </>
                      )
                    }
                    confidence={result.data.confidence}
                    summary={result.data.summary}
                    findings={result.data.key_findings}
                    actions={result.data.recommended_actions}
                    rationale={result.data.rationale}
                    meta={result}
                    footer={
                      proposal && (
                        <Button type="button" onClick={apply}>
                          <CheckIcon aria-hidden="true" />
                          {t("new.ai.apply")}
                        </Button>
                      )
                    }
                  />
                )}
              </div>
            )}

            {wizard.current === 1 && (
              <div className="grid gap-6">
                {suggestion && (
                  <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                    <SparklesIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      {t("new.ai.suggested", {
                        category: t(`category.${suggestion.category}`),
                        priority: t(`priority.${suggestion.priority}`),
                        pct: fmt.percent(suggestion.confidence),
                      })}
                    </span>
                  </p>
                )}
                <RadioField
                  control={form.control}
                  name="category"
                  label={t("field.category")}
                  required
                  className="sm:[&_[role=radiogroup]]:grid-cols-2"
                  options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`), hint: t(`category.${c}.hint`) }))}
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <RadioField
                    control={form.control}
                    name="priority"
                    label={t("field.priority")}
                    variant="inline"
                    required
                    options={PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) }))}
                  />
                  <SelectField
                    control={form.control}
                    name="channel"
                    label={t("field.channel")}
                    required
                    options={CHANNELS.map((c) => ({ value: c, label: t(`channel.${c}`) }))}
                  />
                </div>
              </div>
            )}

            {wizard.current === 2 && (
              <div className="grid gap-6">
                {/* The names come from the barangays layer (real data, or the fixtures until it lands). */}
                <LoadGate state={barangays}>
                  {() => (
                    <BarangayField control={form.control} name="barangay" label={t("field.barangay")} barangays={barangayNames} required />
                  )}
                </LoadGate>
                <NumberField
                  control={form.control}
                  name="households"
                  label={t("field.households")}
                  description={t("field.householdsHint")}
                  unit={t("field.householdsUnit")}
                  min={1}
                  max={500}
                  required
                  className="sm:max-w-xs"
                />
                <TextField
                  control={form.control}
                  name="landmark"
                  label={t("field.landmark")}
                  description={t("field.landmarkHint")}
                  maxLength={80}
                  autoComplete="off"
                />
              </div>
            )}

            {wizard.current === 3 && (
              <div className="grid gap-6">
                <Summary values={form.getValues()} code={code} suggestion={suggestion} />
                <CheckboxField control={form.control} name="confirmed" label={t("field.confirm")} description={t("field.confirmHint")} />
              </div>
            )}
          </Wizard>
        </form>
      </Form>
    </ConsoleFrame>
  );
}

/** The answers read back before filing, as a description list. */
function Summary({ values, code, suggestion }: { values: Partial<Values>; code: string; suggestion: Suggestion | null }) {
  const t = useT(strings);
  const fmt = useFormat();
  const kept = suggestion && values.category && values.priority ? triageDecision(suggestion, { category: values.category, priority: values.priority }).decision : null;
  const rows: [string, ReactNode][] = [
    [t("new.nextCode"), <span className="font-semibold tabular-nums">{code}</span>],
    [t("field.category"), values.category ? <CategoryLabel category={values.category} /> : "—"],
    [t("field.priority"), <PriorityBadge urgent={values.priority === "urgent"} />],
    [t("field.channel"), values.channel ? t(`channel.${values.channel}`) : "—"],
    [t("field.barangay"), values.barangay || "—"],
    [t("field.households"), values.households ?? "—"],
    [t("field.landmark"), values.landmark?.trim() || <span className="text-muted-foreground">{t("new.notGiven")}</span>],
    [t("col.details"), values.details?.trim() || <span className="text-muted-foreground">{t("new.notGiven")}</span>],
    [
      t("new.ai.title"),
      suggestion ? (
        `${t("new.ai.suggested.short", { pct: fmt.percent(suggestion.confidence) })} · ${t(kept === "changed" ? "detail.ai.changed" : "detail.ai.accepted")}`
      ) : (
        <span className="text-muted-foreground">{t("detail.ai.none")}</span>
      ),
    ],
  ];
  return (
    <section aria-labelledby="new-summary" className="rounded-lg border bg-muted/40 p-4 sm:p-5">
      <h3 id="new-summary" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {t("new.summary")}
      </h3>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="min-w-0 font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The console's right-hand panel on this page: what happens after filing. */
function AfterFiling({ code }: { code: string }) {
  const t = useT(strings);
  const steps = [
    fill(t("new.aside.1"), { code: <strong className="font-semibold whitespace-nowrap text-foreground">{code}</strong> }),
    t("new.aside.2"),
    t("new.aside.3"),
  ];
  return (
    <>
      <h2 className="font-display text-lg font-semibold">{t("new.aside.title")}</h2>
      <ol className="flex flex-col gap-3">
        {steps.map((text, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="pt-0.5">{text}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
