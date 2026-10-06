import { useFormat, useT } from "@rcene/i18n";
import { SourcesPage } from "@rcene/ui";
import { SEED, SEED_COUNT } from "@/domain/records.ts";
import { strings } from "@/i18n/strings.ts";

/** /sources: the shipped layers (sources.json), plus this app's synthetic requests and how they are made. */
export function Sources() {
  const t = useT(strings);
  const fmt = useFormat();
  return (
    <SourcesPage
      extra={[
        {
          file: t("sources.records.file"),
          title: t("sources.records.title"),
          tier: "synthetic",
          attribution: t("sources.records.attribution", { n: fmt.number(SEED_COUNT), seed: SEED }),
        },
      ]}
    >
      <section aria-labelledby="sources-how" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised">
        <h2 id="sources-how" className="font-display text-lg font-semibold">
          {t("sources.how.title")}
        </h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm marker:text-primary">
          <li>{t("sources.how.1")}</li>
          <li>{t("sources.how.2")}</li>
          <li>{t("sources.how.3")}</li>
          <li>{t("sources.how.4")}</li>
        </ul>
      </section>
    </SourcesPage>
  );
}
