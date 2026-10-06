import type { ComponentProps } from "react";
import { Link } from "react-router";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { Button } from "@rcene/ui/components/button";
import { Skeleton } from "@rcene/ui/components/skeleton";
import { cn } from "@rcene/ui/lib/utils";
import { useActiveProvider } from "../hooks.ts";
import { useAiStrings } from "../strings.ts";
import { useProviderName } from "./ai-source-badge.tsx";

export interface AiRunButtonProps extends Omit<ComponentProps<typeof Button>, "children"> {
  running?: boolean;
  /** Default "Analyze with AI". */
  label?: string;
}

/** The button that starts an AI run: a sparkle, then a spinner (still under reduced motion: no spin). */
export function AiRunButton({ running = false, label, disabled, ...props }: AiRunButtonProps) {
  const t = useT(useAiStrings());
  return (
    <Button {...props} disabled={disabled || running} aria-busy={running || undefined}>
      {running ? <Loader2Icon aria-hidden="true" className="motion-safe:animate-spin" /> : <SparklesIcon aria-hidden="true" />}
      {label ?? t("ai.run")}
    </Button>
  );
}

/** The loading state of an AI answer: who is being asked, and placeholder lines. Announced politely. */
export function AiThinking({ className }: { className?: string }) {
  const t = useT(useAiStrings());
  const name = useProviderName();
  const { provider } = useActiveProvider();
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-raised", className)}>
      <p className="flex items-center gap-2 font-medium">
        <Loader2Icon aria-hidden="true" className="size-4 text-primary motion-safe:animate-spin" />
        {t("ai.running", { provider: name(provider) })}
      </p>
      <p className="text-sm text-muted-foreground">{t("ai.thinking")}</p>
      <div aria-hidden="true" className="flex flex-col gap-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * A small chip with the AI in use ("AI: OpenAI (ChatGPT) · gpt-5.4-mini"), linking to the
 * settings page when `to` is given. Says so when the chosen provider is not set up.
 */
export function AiProviderChip({ to, className }: { to?: string; className?: string }) {
  const t = useT(useAiStrings());
  const name = useProviderName();
  const { provider, model, ready } = useActiveProvider();
  const text = ready ? t("ai.inUse", { provider: [name(provider), model].filter(Boolean).join(" · ") }) : t("ai.inUseNotReady", { provider: name(provider) });
  const classes = cn(
    "inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium [&>svg]:size-3.5 [&>svg]:shrink-0",
    ready ? "border-primary/30 bg-primary/10 text-foreground" : "border-warning-foreground/30 bg-warning text-warning-foreground",
    to && "hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
    className,
  );
  const body = (
    <>
      <SparklesIcon aria-hidden="true" />
      <span className="truncate">{text}</span>
    </>
  );
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <span className={classes}>{body}</span>
  );
}
