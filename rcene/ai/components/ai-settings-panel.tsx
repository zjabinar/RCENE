import { useEffect, useId, useState } from "react";
import { CircleCheckIcon, CircleDashedIcon, RefreshCwIcon, WifiOffIcon } from "lucide-react";
import { useFormat, useLang, useT } from "@rcene/i18n";
import { Alert, AlertDescription } from "@rcene/ui/components/alert";
import { Button } from "@rcene/ui/components/button";
import { Input } from "@rcene/ui/components/input";
import { Label } from "@rcene/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@rcene/ui/components/radio-group";
import { Switch } from "@rcene/ui/components/switch";
import { cn } from "@rcene/ui/lib/utils";
import { AiTaskError, runAiTask } from "../client.ts";
import { useAiLog } from "../log.ts";
import { AI_PROVIDERS, DEFAULT_MODELS, PROVIDER_KEY_ENV, isLiveProvider, type AiProviderId, type LiveProviderId, type ProviderStatus } from "../protocol.ts";
import { resolveModel, resolveProvider, useAiSettings, type ProviderChoice } from "../settings.ts";
import { useAiStatus } from "../status.ts";
import { useAiStrings } from "../strings.ts";
import { pingTask } from "../tasks/ping.ts";
import { useProviderName } from "./ai-source-badge.tsx";

const CHOICES: readonly ProviderChoice[] = ["auto", ...AI_PROVIDERS];

function ReadyChip({ status, provider }: { status: ProviderStatus | undefined; provider: AiProviderId }) {
  const t = useT(useAiStrings());
  const chip = "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium [&>svg]:size-3.5";
  if (!isLiveProvider(provider))
    return (
      <span className={cn(chip, "border-border bg-muted text-muted-foreground")}>
        <WifiOffIcon aria-hidden="true" />
        {t("ai.settings.offline")}
      </span>
    );
  return status?.configured ? (
    <span className={cn(chip, "border-primary/30 bg-primary/10 text-foreground")}>
      <CircleCheckIcon aria-hidden="true" />
      {t("ai.settings.ready")}
    </span>
  ) : (
    <span className={cn(chip, "border-warning-foreground/30 bg-warning text-warning-foreground")}>
      <CircleDashedIcon aria-hidden="true" />
      {t("ai.settings.notReady")}
    </span>
  );
}

type TestState = { kind: "idle" } | { kind: "running" } | { kind: "ok"; text: string } | { kind: "fail"; text: string };

/**
 * The AI settings: who answers (automatic, demo rules, OpenAI, Claude, Gemini, a local
 * model), the model per provider, the fallback switch and a connection test. Shows which
 * providers have a key in the env file; never shows or asks for a key.
 */
export function AiSettingsPanel({ className }: { className?: string }) {
  const t = useT(useAiStrings());
  const fmt = useFormat();
  const name = useProviderName();
  const [lang] = useLang();
  const { state, status, refresh } = useAiStatus();
  const choice = useAiSettings((s) => s.provider);
  const models = useAiSettings((s) => s.models);
  const fallback = useAiSettings((s) => s.fallback);
  const setProvider = useAiSettings((s) => s.setProvider);
  const setModel = useAiSettings((s) => s.setModel);
  const setFallback = useAiSettings((s) => s.setFallback);
  const addLog = useAiLog((s) => s.add);
  const provider = resolveProvider(choice, status);
  const live = isLiveProvider(provider) ? provider : null;
  const [draftModel, setDraftModel] = useState("");
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const modelId = useId();
  const fallbackId = useId();
  const groupId = useId();

  useEffect(() => {
    setDraftModel(live ? (models[live] ?? "") : "");
  }, [live, models]);
  useEffect(() => setTest({ kind: "idle" }), [provider]);

  const statusOf = (id: AiProviderId) => (isLiveProvider(id) ? status?.providers.find((p) => p.id === id) : undefined);
  const defaultModel = (id: LiveProviderId) => statusOf(id)?.model ?? DEFAULT_MODELS[id];

  const runTest = async () => {
    setTest({ kind: "running" });
    try {
      const result = await runAiTask(pingTask, {}, { provider, model: resolveModel(provider, models, status), lang, fallback: false });
      addLog(result);
      setTest({
        kind: "ok",
        text: result.mode === "live" ? t("ai.settings.testOk", { provider: name(provider), s: fmt.number(result.latencyMs / 1000, 1), reply: result.data.reply }) : t("ai.settings.testDemo"),
      });
    } catch (error) {
      const message = error instanceof AiTaskError || error instanceof Error ? error.message : String(error);
      setTest({ kind: "fail", text: t("ai.settings.testFail", { error: message }) });
    }
  };

  const commitModel = () => {
    if (live) setModel(live, draftModel);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {state === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("ai.settings.checking")}
        </p>
      )}
      {state === "unavailable" && (
        <Alert>
          <WifiOffIcon aria-hidden="true" />
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{t("ai.settings.relayMissing")}</span>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              <RefreshCwIcon aria-hidden="true" />
              {t("ai.settings.refresh")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend id={groupId} className="mb-1 font-semibold">
          {t("ai.settings.choice")}
        </legend>
        <RadioGroup value={choice} onValueChange={(v) => setProvider(v as ProviderChoice)} aria-labelledby={groupId} className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {CHOICES.map((id) => {
            const itemId = `${groupId}-${id}`;
            const title = id === "auto" ? t("ai.settings.auto") : name(id);
            const hint = id === "auto" ? t("ai.settings.autoHint", { provider: name(status?.defaultProvider ?? "demo") }) : t(`ai.provider.${id}.hint`);
            const target = id === "auto" ? (status?.defaultProvider ?? "demo") : id;
            const providerStatus = statusOf(target);
            return (
              <Label
                key={id}
                htmlFor={itemId}
                className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem id={itemId} value={id} className="mt-0.5" />
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm text-muted-foreground">{hint}</span>
                  <ReadyChip status={providerStatus} provider={target} />
                  {isLiveProvider(target) && !providerStatus?.configured && state === "ready" && (
                    <span className="text-xs text-muted-foreground">{t("ai.settings.notReadyHint", { env: PROVIDER_KEY_ENV[target] })}</span>
                  )}
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </fieldset>

      {live && (
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor={modelId}>{t("ai.settings.model", { provider: name(live) })}</Label>
          <Input
            id={modelId}
            value={draftModel}
            placeholder={defaultModel(live)}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setDraftModel(e.target.value)}
            onBlur={commitModel}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitModel();
            }}
          />
          <p className="text-xs text-muted-foreground">{t("ai.settings.modelHint", { model: defaultModel(live) })}</p>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Switch id={fallbackId} checked={fallback} onCheckedChange={setFallback} className="mt-0.5" />
        <div className="flex flex-col gap-1">
          <Label htmlFor={fallbackId}>{t("ai.settings.fallback")}</Label>
          <p className="text-sm text-muted-foreground">{t("ai.settings.fallbackHint")}</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2">
        <Button variant="outline" onClick={() => void runTest()} disabled={test.kind === "running"} aria-busy={test.kind === "running" || undefined}>
          <RefreshCwIcon aria-hidden="true" className={cn(test.kind === "running" && "motion-safe:animate-spin")} />
          {test.kind === "running" ? t("ai.settings.testing") : t("ai.settings.test")}
        </Button>
        <p role="status" aria-live="polite" className={cn("text-sm", test.kind === "fail" ? "text-destructive" : "text-muted-foreground")}>
          {test.kind === "ok" || test.kind === "fail" ? test.text : ""}
        </p>
      </div>
    </div>
  );
}
