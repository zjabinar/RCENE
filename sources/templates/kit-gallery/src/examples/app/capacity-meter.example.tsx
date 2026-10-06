import { useId, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { CapacityMeter } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "CapacityMeter",
  summary: {
    en: "How full a place is, as a meter with the numbers and a state in words and an icon: open, nearly full, full or over capacity.",
    war: "Kun gaano kapuno an lugar: meter upod an mga numero ngan kahimtang ha pulong ngan icon: bukas, hapit na puno, puno o sobra.",
    fil: "Kung gaano kapuno ang lugar: meter na may mga numero at katayuan sa salita at icon: bukas, halos puno, puno o lampas.",
  },
  blocks: ["CapacityMeter"],
  order: 80,
  frameHeight: 820,
};

const strings = {
  en: {
    centres: "Evacuation centres · BRGY-05",
    court: "EC-01 · Covered court",
    chapel: "EC-02 · Chapel hall",
    school: "EC-03 · Elementary school",
    gym: "EC-04 · Barangay gym",
    tryIt: "Try it: arrivals at EC-01",
    arrive: "10 arrive",
    leave: "10 leave",
    sample: "Sample data.",
  },
  war: {
    centres: "Mga evacuation center · BRGY-05",
    court: "EC-01 · Covered court",
    chapel: "EC-02 · Hall han kapilya",
    school: "EC-03 · Elementarya",
    gym: "EC-04 · Gym han barangay",
    tryIt: "Testingi: mga inabot ha EC-01",
    arrive: "10 an inabot",
    leave: "10 an binaya",
    sample: "Sample nga datos.",
  },
  fil: {
    centres: "Mga evacuation center · BRGY-05",
    court: "EC-01 · Covered court",
    chapel: "EC-02 · Bulwagan ng kapilya",
    school: "EC-03 · Paaralang elementarya",
    gym: "EC-04 · Gym ng barangay",
    tryIt: "Subukan: mga dumating sa EC-01",
    arrive: "10 ang dumating",
    leave: "10 ang umalis",
    sample: "Sample na datos.",
  },
};

export function Example() {
  const t = useT(strings);
  const headingId = useId();
  const [court, setCourt] = useState(96);
  return (
    <section
      aria-labelledby={headingId}
      className="flex max-w-2xl flex-col gap-6 rounded-xl border bg-card p-5 text-card-foreground shadow-raised"
    >
      <div>
        <h2 id={headingId} className="font-display text-lg font-semibold">
          {t("centres")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("sample")}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        <CapacityMeter label={t("court")} value={court} max={150} />
        <div role="group" aria-label={t("tryIt")} className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-xs font-medium text-muted-foreground">{t("tryIt")}</span>
          <Button size="sm" variant="outline" onClick={() => setCourt((v) => Math.max(0, v - 10))}>
            <MinusIcon aria-hidden="true" />
            {t("leave")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCourt((v) => v + 10)}>
            <PlusIcon aria-hidden="true" />
            {t("arrive")}
          </Button>
        </div>
      </div>
      <CapacityMeter label={t("chapel")} value={68} max={80} />
      <CapacityMeter label={t("school")} value={240} max={240} />
      <CapacityMeter label={t("gym")} value={212} max={180} />
    </section>
  );
}
