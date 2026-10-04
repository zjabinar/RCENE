import { useId, useState, type ReactNode } from "react";
import { BellIcon, ClipboardListIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { ConsoleLayout, KpiRow, StatusTimeline } from "@rcene/kit/app";
import { Badge } from "@rcene/ui/components/badge";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "ConsoleLayout · KpiRow",
  summary: {
    en: "An operator console: sections in a sticky sidebar (a Menu sheet on phones), headline numbers on top, the selected record in a side panel.",
    war: "Console han operator: mga seksyon ha sidebar (Menu nga sheet ha telepono), mga numero ha ibabaw, an napili nga rekord ha panel ha kilid.",
    fil: "Console ng operator: mga seksiyon sa sidebar (Menu na sheet sa telepono), mga numero sa itaas, ang napiling rekord sa panel sa gilid.",
  },
  blocks: ["ConsoleLayout", "KpiRow"],
  order: 20,
  bleed: true,
  frameHeight: 760,
};

const strings = {
  en: {
    console: "Barangay desk",
    overview: "Overview",
    queue: "Queue",
    teams: "Teams",
    alerts: "Alerts",
    waiting: "Waiting",
    today: "Today at BRGY-05",
    filed: "Filed today",
    open: "Still open",
    late: "Over 3 days",
    avg: "Average wait",
    hours: "{n} h",
    sampleData: "Sample data",
    queueTitle: "Waiting for a team",
    sectionLead: "In an app each section is its own route; here the console keeps it in state.",
    selected: "Selected request",
    stFiled: "Filed",
    stChecked: "Checked by the desk",
    stTeam: "Team T-04 assigned",
    stClosed: "Closed",
    days: "{n} d",
    drainage: "Clogged drainage",
    light: "Streetlight out",
    road: "Pothole",
    waste: "Missed waste pickup",
  },
  war: {
    console: "Desk han barangay",
    overview: "Kabug-osan",
    queue: "Pila",
    teams: "Mga team",
    alerts: "Mga alerto",
    waiting: "Naghuhulat",
    today: "Yana nga adlaw ha BRGY-05",
    filed: "Ginsumite yana",
    open: "Bukas pa",
    late: "Labaw 3 ka adlaw",
    avg: "Promedyo nga paghulat",
    sampleData: "Sample nga datos",
    queueTitle: "Naghuhulat hin team",
    sectionLead: "Ha app, may kalugaringon nga ruta an kada seksyon; dinhi, ha state la.",
    selected: "Napili nga hangyo",
    stFiled: "Ginsumite",
    stChecked: "Gin-check han desk",
    stTeam: "Gin-assign an Team T-04",
    stClosed: "Sirado",
    days: "{n} ka adlaw",
    drainage: "Barado nga kanal",
    light: "Patay nga suga ha dalan",
    road: "Lungag ha dalan",
    waste: "Waray nakuha nga basura",
  },
  fil: {
    console: "Desk ng barangay",
    overview: "Pangkalahatan",
    queue: "Pila",
    teams: "Mga team",
    alerts: "Mga alerto",
    waiting: "Naghihintay",
    today: "Ngayong araw sa BRGY-05",
    filed: "Isinumite ngayon",
    open: "Bukas pa",
    late: "Lampas 3 araw",
    avg: "Karaniwang paghihintay",
    sampleData: "Sample na datos",
    queueTitle: "Naghihintay ng team",
    sectionLead: "Sa app, may sariling ruta ang bawat seksiyon; dito, nasa state lang.",
    selected: "Napiling kahilingan",
    stFiled: "Isinumite",
    stChecked: "Sinuri ng desk",
    stTeam: "Na-assign ang Team T-04",
    stClosed: "Sarado",
    days: "{n} araw",
    drainage: "Baradong kanal",
    light: "Patay na ilaw sa kalye",
    road: "Lubak sa kalsada",
    waste: "Hindi nakuhang basura",
  },
};

const WAITING = [
  { code: "REC-0019", type: "drainage", days: 4 },
  { code: "REC-0021", type: "light", days: 2 },
  { code: "REC-0022", type: "road", days: 1 },
  { code: "REC-0024", type: "waste", days: 0 },
] as const;

type Section = "overview" | "queue" | "teams" | "alerts";

export function Example() {
  const t = useT(strings);
  // In an app, give each item a route instead: { to: "/desk/queue", label: … }.
  const [section, setSection] = useState<Section>("queue");
  const queueId = useId();
  const item = (id: Section, icon: ReactNode, badge?: number) => ({
    label: t(id),
    icon,
    badge,
    active: section === id,
    onSelect: () => setSection(id),
  });

  return (
    // A fixed-height box for the gallery; in an app it fills <AppShell width="full">.
    <div className="flex h-[38rem] flex-col overflow-y-auto [--kit-console-top:0px]">
      <ConsoleLayout
        title={t("console")}
        nav={[
          item("overview", <LayoutDashboardIcon aria-hidden="true" />),
          item("queue", <ClipboardListIcon aria-hidden="true" />, WAITING.length),
          item("teams", <UsersIcon aria-hidden="true" />),
          item("alerts", <BellIcon aria-hidden="true" />, 1),
        ]}
        aside={
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">REC-0019</h2>
              <Badge variant="secondary">{t("selected")}</Badge>
            </div>
            <StatusTimeline
              label="REC-0019"
              items={[
                { id: "filed", label: t("stFiled"), state: "done", time: new Date("2026-10-03T08:20:00+08:00") },
                { id: "checked", label: t("stChecked"), state: "done", time: new Date("2026-10-03T10:05:00+08:00") },
                { id: "team", label: t("stTeam"), state: "current" },
                { id: "closed", label: t("stClosed"), state: "upcoming" },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t(section)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("sectionLead")}</p>
          </div>
          <KpiRow
            label={t("today")}
            columns={2}
            items={[
              { id: "filed", label: t("filed"), value: 7, hint: t("sampleData") },
              { id: "open", label: t("open"), value: 12 },
              { id: "late", label: t("late"), value: 2, tone: "warning" },
              { id: "avg", label: t("avg"), value: t("hours", { n: "5.5" }) },
            ]}
          />
          <section aria-labelledby={queueId} className="rounded-xl border bg-card p-4 text-card-foreground shadow-raised">
            <h3 id={queueId} className="font-display text-lg font-semibold">
              {t("queueTitle")}
            </h3>
            <ul className="mt-3 divide-y">
              {WAITING.map((r) => (
                <li key={r.code} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-semibold">{r.code}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{t(r.type)}</span>
                  <span className="tabular-nums">{t("days", { n: r.days })}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </ConsoleLayout>
    </div>
  );
}
