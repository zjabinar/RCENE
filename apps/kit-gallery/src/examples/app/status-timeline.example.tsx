import { useId } from "react";
import { useT } from "@rcene/i18n";
import { StatusTimeline } from "@rcene/kit/app";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "StatusTimeline",
  summary: {
    en: "Where a request stands: each step with an icon and a state word, the current one marked for screen readers; a row from sm up for short flows.",
    war: "Kun aadi na an hangyo: kada lakang may icon ngan pulong han kahimtang, an yana nga lakang may marka para ha screen reader; linya tikang sm para ha mubo nga proseso.",
    fil: "Kung nasaan na ang kahilingan: bawat hakbang may icon at salita ng katayuan, may marka ang kasalukuyan para sa screen reader; pahalang mula sm para sa maiikling proseso.",
  },
  blocks: ["StatusTimeline"],
  order: 70,
  frameHeight: 900,
};

const strings = {
  en: {
    request: "Request REC-0007 · BRGY-05",
    filed: "Request filed",
    filedNote: "At the barangay hall desk.",
    checked: "Checked by the barangay",
    team: "Repair team T-04 on the way",
    teamNote: "Expected before noon.",
    road: "Road access",
    roadNote: "Waiting for the flooded lane to drain.",
    closed: "Closed",
    short: "Permit PRM-0031",
    applied: "Applied",
    paid: "Fee paid",
    review: "Review",
    release: "Release",
  },
  war: {
    request: "Hangyo REC-0007 · BRGY-05",
    filed: "Ginsumite an hangyo",
    filedNote: "Ha desk han barangay hall.",
    checked: "Gin-check han barangay",
    team: "Padulong na an repair team T-04",
    teamNote: "Inaasahan antes han udto.",
    road: "Agian ha dalan",
    roadNote: "Naghuhulat nga mahubas an nalunop nga agianan.",
    closed: "Sirado",
    short: "Permit PRM-0031",
    applied: "Nag-aplay",
    paid: "Nabayaran an bayad",
    review: "Pagsusi",
    release: "Pagluwat",
  },
  fil: {
    request: "Kahilingan REC-0007 · BRGY-05",
    filed: "Isinumite ang kahilingan",
    filedNote: "Sa desk ng barangay hall.",
    checked: "Sinuri ng barangay",
    team: "Papunta na ang repair team T-04",
    teamNote: "Inaasahan bago magtanghali.",
    road: "Daanan sa kalsada",
    roadNote: "Hinihintay na humupa ang baha sa daanan.",
    closed: "Sarado",
    short: "Permit PRM-0031",
    applied: "Nag-apply",
    paid: "Nabayaran ang bayad",
    review: "Pagsusuri",
    release: "Paglabas",
  },
};

function Label({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-sans text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

export function Example() {
  const t = useT(strings);
  const verticalId = useId();
  const rowId = useId();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section
        aria-labelledby={verticalId}
        className="flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-raised"
      >
        <Label id={verticalId}>{t("request")}</Label>
        <StatusTimeline
          label={t("request")}
          items={[
            { id: "filed", label: t("filed"), state: "done", time: new Date("2026-10-06T08:12:00+08:00"), note: t("filedNote") },
            { id: "checked", label: t("checked"), state: "done", time: new Date("2026-10-06T09:40:00+08:00") },
            { id: "team", label: t("team"), state: "current", note: t("teamNote") },
            { id: "road", label: t("road"), state: "blocked", note: t("roadNote") },
            { id: "closed", label: t("closed"), state: "upcoming" },
          ]}
        />
      </section>
      <section
        aria-labelledby={rowId}
        className="flex flex-col gap-4 self-start rounded-xl border bg-card p-5 text-card-foreground shadow-raised"
      >
        <Label id={rowId}>{t("short")}</Label>
        <StatusTimeline
          orientation="horizontal"
          label={t("short")}
          items={[
            { id: "applied", label: t("applied"), state: "done", time: "2026-10-01" },
            { id: "paid", label: t("paid"), state: "done", time: "2026-10-02" },
            { id: "review", label: t("review"), state: "current" },
            { id: "release", label: t("release"), state: "upcoming" },
          ]}
        />
      </section>
    </div>
  );
}
