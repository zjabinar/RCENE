import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import { useLayer, type SourceEntry } from "@rcene/data";
import { common, useT } from "@rcene/i18n";

import { Badge } from "./ui/badge.tsx";
import { EmptyState, LoadGate } from "./states.tsx";

const TIER_VARIANT = {
  open: "secondary",
  permission: "outline",
  synthetic: "outline",
  fixture: "warning",
} as const satisfies Record<SourceEntry["tier"], "secondary" | "outline" | "warning">;

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

function SourceItem({ entry }: { entry: SourceEntry }) {
  const t = useT(common);
  return (
    <article className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 text-base leading-snug font-semibold">{entry.title}</h2>
        <Badge variant={TIER_VARIANT[entry.tier]}>{t(`sources.tier.${entry.tier}`)}</Badge>
      </div>
      <p className="mt-1 text-sm">{entry.attribution}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 break-all">{entry.file}</code>
        {entry.license && <span>{entry.license}</span>}
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1 break-all underline underline-offset-4 hover:text-primary"
          >
            {displayUrl(entry.url)}
            <ExternalLinkIcon className="size-3 shrink-0" aria-hidden="true" />
          </a>
        )}
      </div>
      {entry.notes && <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>}
    </article>
  );
}

/** The /sources route: every shipped file with its attribution and tier, then the disclaimer. */
export function SourcesPage() {
  const t = useT(common);
  const sources = useLayer("sources");
  return (
    <div data-slot="sources-page" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("sources.title")}</h1>
      <LoadGate state={sources}>
        {(entries) =>
          entries.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.file}>
                  <SourceItem entry={entry} />
                </li>
              ))}
            </ul>
          )
        }
      </LoadGate>
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t("app.disclaimer")}</span>
      </p>
    </div>
  );
}
