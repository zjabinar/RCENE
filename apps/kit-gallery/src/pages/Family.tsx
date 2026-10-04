import { Link, useParams } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { IllustratedState, PageHeader } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import { strings } from "../i18n/strings.ts";
import { ExampleCard } from "../gallery/preview.tsx";
import { entriesOf, findEntry, type Family } from "../gallery/registry.ts";

/** "/app", "/site", "/poster", "/brand": every example of one family, with a jump list. */
export function FamilyPage({ family }: { family: Family }) {
  const t = useT(strings);
  const entries = entriesOf(family);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("app.title")}
        title={t(`family.${family}`)}
        description={t(`family.${family}.summary`)}
        breadcrumbs={[{ label: t("nav.overview"), to: "/" }, { label: t(`family.${family}`) }]}
      />
      {entries.length > 0 && (
        <nav aria-label={t(`family.${family}`)} className="-mt-2">
          <ul className="flex flex-wrap gap-2">
            {entries.map((e) => (
              <li key={e.slug}>
                <a
                  href={`#${e.slug}`}
                  className="inline-flex h-8 items-center rounded-full border bg-card px-3 font-mono text-xs text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {e.meta.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="flex flex-col gap-8">
        {entries.map((entry) => (
          <ExampleCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/** "/<family>/<slug>": one example on its own, code open. */
export function BlockPage({ family }: { family: Family }) {
  const t = useT(strings);
  const { slug } = useParams();
  const entry = findEntry(family, slug);
  const back = (
    <Button variant="outline" asChild>
      <Link to={`/${family}`}>
        <ArrowLeftIcon aria-hidden="true" />
        {t("preview.backTo", { family: t(`family.${family}`) })}
      </Link>
    </Button>
  );
  if (!entry) {
    return <IllustratedState spot="search" title={t("preview.notFound", { name: slug ?? "" })} actions={back} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t(`family.${family}`)}
        title={entry.meta.title}
        breadcrumbs={[{ label: t("nav.overview"), to: "/" }, { label: t(`family.${family}`), to: `/${family}` }, { label: entry.meta.title }]}
        actions={back}
      />
      <ExampleCard entry={entry} standalone />
    </div>
  );
}
