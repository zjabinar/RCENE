import { MonitorIcon, PresentationIcon, SmartphoneIcon, type LucideIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { RoleLauncher } from "@rcene/ui";
import type { RoleId } from "@/roles.ts";
import { ROLES } from "@/roles.ts";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

const ROLE_ICONS: Record<RoleId, LucideIcon> = {
  console: MonitorIcon,
  resident: SmartphoneIcon,
  board: PresentationIcon,
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
        windowPrefix="starter-app"
        className="lg:grid-cols-3"
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
          {t("start.sample", { n: fmt.number(records.length), last })}
        </p>
      </section>
    </div>
  );
}
