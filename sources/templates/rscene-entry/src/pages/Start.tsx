import { Link } from "react-router";
import { FileImageIcon, MonitorIcon, PresentationIcon, SlidersHorizontalIcon, SmartphoneIcon, TvIcon, type LucideIcon } from "lucide-react";
import { AiProviderChip } from "@rcene/ai";
import { useFormat, useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { RoleLauncher } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import type { RoleId } from "@/roles.ts";
import { ROLES } from "@/roles.ts";
import { fill } from "@/i18n/fill.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

const ROLE_ICONS: Record<RoleId, LucideIcon> = {
  console: MonitorIcon,
  resident: SmartphoneIcon,
  board: TvIcon,
  admin: SlidersHorizontalIcon,
};

const STEPS = ["start.step1", "start.step2", "start.step3"] as const;

/** "/": the role launcher. Each role opens here, or in its own sized window for the demo. */
export function Start() {
  const t = useT(strings);
  const fmt = useFormat();
  const records = useRecords((s) => s.records);
  const last = records[records.length - 1]?.code ?? "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t("start.eyebrow")} title={t("start.title")} description={t("start.lead")} className="pb-0 sm:pb-0" />

      <RoleLauncher
        windowPrefix="rscene-entry"
        className="sm:grid-cols-2 xl:grid-cols-4"
        roles={ROLES.map((role) => {
          const Icon = ROLE_ICONS[role.id];
          return {
            id: role.id,
            to: role.path,
            width: role.width,
            icon: <Icon />,
            title: t(`role.${role.id}.title`),
            summary: t(`role.${role.id}.summary`),
          };
        })}
      />

      <section aria-labelledby="start-how" className="rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:p-6">
        <h2 id="start-how" className="font-display text-xl font-semibold">
          {t("start.how")}
        </h2>
        <ol className="mt-5 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground tabular-nums"
              >
                {fmt.number(i + 1)}
              </span>
              <div className="flex flex-col gap-1 pt-1">
                <h3 className="leading-tight font-semibold">{t(`${step}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`${step}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">
          {fill(t("start.sample", { n: fmt.number(records.length) }), { last: <span className="whitespace-nowrap">{last}</span> })}
        </p>
      </section>

      <section aria-labelledby="start-present" className="flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-col gap-2">
          <h2 id="start-present" className="font-display text-xl font-semibold">
            {t("start.present")}
          </h2>
          <AiProviderChip to="/admin/ai" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/demo">
              <PresentationIcon aria-hidden="true" />
              {t("start.demo")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/poster">
              <FileImageIcon aria-hidden="true" />
              {t("start.poster")}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
