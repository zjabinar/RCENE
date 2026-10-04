/**
 * /sources: every shipped layer with its credit and tier (SourcesPage reads
 * sources.json), then how this site's own numbers are made.
 */
import { CalculatorIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { SITE_CONTAINER } from "@rcene/kit/site";
import { SourcesPage } from "@rcene/ui";
import { cn } from "@rcene/ui/lib/utils";
import { strings } from "@/i18n/strings.ts";

const METHOD = ["counts", "share", "facilities", "limits"] as const;

export function Sources() {
  const t = useT(strings);
  return (
    <div className={cn(SITE_CONTAINER, "py-12 sm:py-16")}>
      <SourcesPage>
        <section aria-labelledby="method" className="rounded-xl border bg-card p-6 text-card-foreground shadow-raised">
          <h2 id="method" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
            <CalculatorIcon aria-hidden="true" className="size-5 text-primary" />
            {t("sources.method.title")}
          </h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 ps-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {METHOD.map((key) => (
              <li key={key}>{t(`sources.method.${key}`)}</li>
            ))}
          </ul>
        </section>
      </SourcesPage>
    </div>
  );
}
