import { useId, type ReactNode } from "react";
import { ArrowRightIcon, CircleDotIcon, SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import type { AiResultMeta } from "../client.ts";
import { useAiStrings } from "../strings.ts";
import { AiSourceBadge, useProviderName } from "./ai-source-badge.tsx";
import { ConfidenceMeter } from "./confidence-meter.tsx";

export interface AiInsightCardProps {
  /** Default "AI analysis". */
  title?: string;
  /** The card's heading level (default 2; lists inside use the next level). */
  headingLevel?: 2 | 3;
  /** The main verdict next to the title: chips such as the category and the priority. */
  label?: ReactNode;
  /** 0 to 1. */
  confidence?: number;
  summary?: ReactNode;
  findings?: readonly string[];
  findingsTitle?: string;
  risks?: readonly string[];
  risksTitle?: string;
  actions?: readonly string[];
  actionsTitle?: string;
  /** Short reasons ("Why the AI suggests this"), folded by default. */
  rationale?: readonly string[];
  /** Who answered: shows the source badge, and the reason after a fallback. */
  meta?: Pick<AiResultMeta, "mode" | "provider" | "requested" | "model" | "latencyMs" | "note">;
  /** Buttons that act on the suggestion (apply, copy, approve). */
  footer?: ReactNode;
  /** Anything else for the body (a draft text, extracted fields). */
  children?: ReactNode;
  className?: string;
}

function Section({ level, title, icon, items, ordered }: { level: 3 | 4; title: string; icon: ReactNode; items: readonly string[]; ordered?: boolean }) {
  const Heading = `h${level}` as "h3" | "h4";
  const List = ordered ? "ol" : "ul";
  return (
    <div className="flex flex-col gap-2">
      <Heading className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</Heading>
      <List className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-snug [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0">
            {icon}
            <span>{item}</span>
          </li>
        ))}
      </List>
    </div>
  );
}

/**
 * One AI answer, ready to scan: verdict chips, confidence, a summary, key findings,
 * risks, recommended actions and the reasons (folded), with who answered and the line
 * "AI suggestion: a person reviews and confirms it". The footer holds the human's
 * decision (apply, edit, approve). Content comes in already translated.
 */
export function AiInsightCard({
  title,
  headingLevel = 2,
  label,
  confidence,
  summary,
  findings,
  findingsTitle,
  risks,
  risksTitle,
  actions,
  actionsTitle,
  rationale,
  meta,
  footer,
  children,
  className,
}: AiInsightCardProps) {
  const t = useT(useAiStrings());
  const name = useProviderName();
  const id = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const sub = (headingLevel + 1) as 3 | 4;

  return (
    <section
      aria-labelledby={id}
      data-ai-mode={meta?.mode}
      className={cn(
        "@container overflow-hidden rounded-xl border bg-card text-card-foreground shadow-raised motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-5 py-3">
        <Heading id={id} className="flex items-center gap-2 font-display text-lg font-semibold">
          <SparklesIcon aria-hidden="true" className="size-5 text-primary" />
          {title ?? t("ai.card.title")}
        </Heading>
        {label && <div className="flex flex-wrap items-center gap-2">{label}</div>}
      </header>

      <div className="flex flex-col gap-5 p-5">
        {summary && <div className="text-base leading-relaxed">{summary}</div>}
        {confidence !== undefined && <ConfidenceMeter value={confidence} />}
        {children}
        <div className="grid gap-5 @lg:grid-cols-2">
          {findings && findings.length > 0 && (
            <Section level={sub} title={findingsTitle ?? t("ai.card.findings")} icon={<CircleDotIcon aria-hidden="true" className="text-primary" />} items={findings} />
          )}
          {risks && risks.length > 0 && (
            <Section level={sub} title={risksTitle ?? t("ai.card.risks")} icon={<TriangleAlertIcon aria-hidden="true" className="text-warning-foreground" />} items={risks} />
          )}
          {actions && actions.length > 0 && (
            <Section level={sub} title={actionsTitle ?? t("ai.card.actions")} icon={<ArrowRightIcon aria-hidden="true" className="text-primary" />} items={actions} ordered />
          )}
        </div>
        {rationale && rationale.length > 0 && (
          <details className="group rounded-lg border bg-background/60 px-4 py-2 text-sm">
            <summary className="cursor-pointer font-medium marker:text-muted-foreground">{t("ai.card.why")}</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-muted-foreground">
              {rationale.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-3 border-t px-5 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          {meta && <AiSourceBadge meta={meta} />}
          {meta?.mode === "fallback" && meta.note && (
            <p className="text-xs text-muted-foreground">{t("ai.source.fallbackWhy", { provider: name(meta.requested ?? "demo"), note: meta.note })}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("ai.card.disclaimer")}</p>
        </div>
        {footer && <div className="flex flex-wrap gap-2">{footer}</div>}
      </footer>
    </section>
  );
}
