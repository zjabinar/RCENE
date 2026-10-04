import { useFormat, useT } from "@rcene/i18n";
import { StatBand } from "@rcene/kit/site";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "StatBand",
  summary: {
    en: "Big numbers that count up the first time they scroll into view (at once under reduced motion), formatted for the language. Pass format for pesos, suffix for units.",
    war: "Dagku nga numero nga nag-iihap pataas han una nga pagkita (dayon kun reduced motion), naka-format para han pinulongan.",
    fil: "Malalaking numero na bumibilang pataas sa unang pagkakita (agad kapag reduced motion), naka-format ayon sa wika.",
  },
  blocks: ["StatBand"],
  order: 50,
  frameHeight: 760,
};

const strings = {
  en: {
    barangays: "Barangays covered",
    households: "Households mapped",
    checked: "Evacuation centres checked",
    fund: "Average go-bag cost",
    drills: "Drills this year",
    teams: "Response teams",
    volunteers: "Volunteers trained",
  },
  war: {
    barangays: "Mga barangay nga sakop",
    households: "Mga panimalay ha mapa",
    checked: "Mga evacuation center nga gin-check",
    fund: "Promedyo nga gasto han go bag",
    drills: "Mga drill yana nga tuig",
    teams: "Mga response team",
    volunteers: "Mga boluntaryo nga natudloan",
  },
  fil: {
    barangays: "Mga barangay na sakop",
    households: "Mga sambahayang naka-mapa",
    checked: "Mga evacuation center na nasuri",
    fund: "Karaniwang gastos sa go bag",
    drills: "Mga drill ngayong taon",
    teams: "Mga response team",
    volunteers: "Mga boluntaryong nasanay",
  },
};

export function Example() {
  const t = useT(strings);
  const fmt = useFormat();
  return (
    <div className="flex flex-col gap-6">
      <StatBand
        items={[
          { value: 57, label: t("barangays") },
          { value: 12480, label: t("households") },
          { value: 87.5, label: t("checked"), suffix: "%" },
          { value: 1728.75, label: t("fund"), format: (n) => fmt.currency(n) },
        ]}
      />
      <StatBand
        tone="brand"
        items={[
          { value: 24, label: t("drills") },
          { value: 57, label: t("teams") },
          { value: 640, label: t("volunteers"), suffix: "+" },
        ]}
      />
    </div>
  );
}
