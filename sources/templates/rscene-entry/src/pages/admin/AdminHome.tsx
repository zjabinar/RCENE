import { Link } from "react-router";
import { ArrowRightIcon, DatabaseIcon, FileImageIcon, FlaskConicalIcon, PaletteIcon, PresentationIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import { LIVE_PROVIDERS, useActiveProvider, useAiLog, useAiStatus, useProviderName } from "@rcene/ai";
import { useFormat, useT } from "@rcene/i18n";
import { KpiRow, PageHeader } from "@rcene/kit/app";
import { AdminFrame } from "@/features/admin/AdminFrame.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

const CARDS: { id: "ai" | "lab" | "appearance" | "data" | "demo" | "poster"; to: string; icon: LucideIcon }[] = [
  { id: "ai", to: "/admin/ai", icon: SparklesIcon },
  { id: "lab", to: "/admin/lab", icon: FlaskConicalIcon },
  { id: "appearance", to: "/admin/appearance", icon: PaletteIcon },
  { id: "data", to: "/admin/data", icon: DatabaseIcon },
  { id: "demo", to: "/demo", icon: PresentationIcon },
  { id: "poster", to: "/poster", icon: FileImageIcon },
];

/** /admin: the setup at a glance (AI in use, providers ready, records, AI runs) and a card per section. */
export function AdminHome() {
  const t = useT(strings);
  const fmt = useFormat();
  const name = useProviderName();
  const { provider, model, ready } = useActiveProvider();
  const { status } = useAiStatus();
  const runs = useAiLog((s) => s.entries.length);
  const records = useRecords((s) => s.records.length);
  const configured = status?.providers.filter((p) => p.configured).length ?? 0;

  return (
    <AdminFrame>
      <PageHeader eyebrow={t("role.admin.title")} title={t("admin.title")} description={t("admin.lead")} />
      <div className="flex flex-col gap-6">
        <KpiRow
          label={t("admin.kpi.label")}
          items={[
            { id: "provider", label: t("admin.kpi.provider"), value: name(provider), hint: model ?? t("admin.kpi.offline"), tone: ready ? "default" : "warning" },
            { id: "ready", label: t("admin.kpi.ready"), value: configured, countUp: true, hint: t("admin.kpi.readyHint", { n: fmt.number(LIVE_PROVIDERS.length) }) },
            { id: "records", label: t("admin.kpi.records"), value: records, countUp: true },
            { id: "runs", label: t("admin.kpi.runs"), value: runs, countUp: true },
          ]}
        />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CARDS.map(({ id, to, icon: Icon }) => (
            <li key={id}>
              <Link
                to={to}
                className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-raised transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-lg font-semibold">{t(`admin.nav.${id}`)}</span>
                </span>
                <span className="text-sm text-muted-foreground">{t(`admin.card.${id}`)}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t("admin.open")}
                  <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AdminFrame>
  );
}
