import { FlaskConicalIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import type { AiResultMeta } from "../client.ts";
import type { AiProviderId } from "../protocol.ts";
import { useAiStrings } from "../strings.ts";

export interface AiSourceBadgeProps {
  meta: Pick<AiResultMeta, "mode" | "provider" | "requested" | "model" | "latencyMs" | "note">;
  className?: string;
}

const TONE = {
  live: "border-primary/30 bg-primary/10 text-foreground",
  demo: "border-border bg-muted text-muted-foreground",
  fallback: "border-warning-foreground/30 bg-warning text-warning-foreground",
} as const;

const ICON = { live: SparklesIcon, demo: FlaskConicalIcon, fallback: TriangleAlertIcon } as const;

/** The provider's display name ("OpenAI (ChatGPT)", "Demo rules"…), in the active language. */
export function useProviderName(): (id: AiProviderId) => string {
  const t = useT(useAiStrings());
  return (id) => t(`ai.provider.${id}`);
}

/**
 * Who answered an AI request, as an icon + words chip: the live provider and model with
 * the time taken, "Demo rules · offline", or "Fallback: demo rules" (with the reason in
 * its title and for screen readers). Never colour alone.
 */
export function AiSourceBadge({ meta, className }: AiSourceBadgeProps) {
  const t = useT(useAiStrings());
  const fmt = useFormat();
  const name = useProviderName();
  const Icon = ICON[meta.mode];
  const seconds = t("ai.source.seconds", { s: fmt.number(meta.latencyMs / 1000, 1) });
  const text =
    meta.mode === "live"
      ? [name(meta.provider), meta.model, seconds].filter(Boolean).join(" · ")
      : meta.mode === "demo"
        ? t("ai.source.demo")
        : t("ai.source.fallback");
  const why = meta.mode === "fallback" && meta.note ? t("ai.source.fallbackWhy", { provider: name(meta.requested ?? "demo"), note: meta.note }) : undefined;

  return (
    <span
      data-mode={meta.mode}
      title={why}
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium [&>svg]:size-3.5 [&>svg]:shrink-0",
        TONE[meta.mode],
        className,
      )}
    >
      <Icon aria-hidden="true" />
      <span className="sr-only">{t("ai.source.label")}: </span>
      <span className="truncate">{text}</span>
      {why && <span className="sr-only">. {why}</span>}
    </span>
  );
}
