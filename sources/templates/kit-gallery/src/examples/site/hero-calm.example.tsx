import { ArrowRightIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { SpotIllustration } from "@rcene/kit/brand";
import { Hero } from "@rcene/kit/site";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "Hero · calm",
  summary: {
    en: "The opening of a landing page in the Living Tapestry look: cream, a display serif and a woven band. The title rises in word by word, and stays plain text under reduced motion.",
    war: "An pagtikang han landing page ha Living Tapestry nga hitsura: cream, display serif ngan hinabol nga banda. An titulo nagbabangon kada pulong, ngan yano nga teksto kun reduced motion.",
    fil: "Ang simula ng landing page sa Living Tapestry na itsura: cream, display serif at hinabing banda. Umaangat ang pamagat bawat salita, at payak na teksto kapag reduced motion.",
  },
  blocks: ["Hero"],
  order: 10,
  bleed: true,
  frameHeight: 900,
};

const strings = {
  en: {
    eyebrow: "Catbalogan City · Preparedness",
    title: "Know your hazard. Plan your route.",
    lead: "Offline maps, family plans and evacuation centres for every barangay, in English, Winaray and Filipino.",
    find: "Find my barangay",
    how: "How it works",
    barangay: "Barangay",
    centre: "Nearest centre",
    distance: "Straight-line",
  },
  war: {
    eyebrow: "Syudad han Catbalogan · Pagkaandam",
    title: "Hibaroa an imo peligro. Planoha an imo agian.",
    lead: "Offline nga mapa, plano han pamilya ngan evacuation center para ha kada barangay, ha English, Winaray ngan Filipino.",
    find: "Bilnga an akon barangay",
    how: "Kon paonan-o ini naandar",
    centre: "Pinakahirani nga center",
    distance: "Tadong nga distansya",
  },
  fil: {
    eyebrow: "Lungsod ng Catbalogan · Kahandaan",
    title: "Alamin ang iyong panganib. Planuhin ang iyong ruta.",
    lead: "Offline na mapa, plano ng pamilya at evacuation center para sa bawat barangay, sa English, Winaray at Filipino.",
    find: "Hanapin ang aking barangay",
    how: "Paano ito gumagana",
    centre: "Pinakamalapit na center",
    distance: "Tuwirang layo",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    <Hero
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      actions={
        <>
          <Button size="lg" asChild>
            <a href="#find">
              {t("find")}
              <ArrowRightIcon aria-hidden="true" />
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#how">{t("how")}</a>
          </Button>
        </>
      }
      media={
        <div className="flex flex-col">
          <div className="flex items-center justify-center bg-muted p-6 sm:p-8">
            <SpotIllustration name="map" size={320} className="h-auto w-full max-w-80" />
          </div>
          <dl className="grid grid-cols-3 divide-x border-t text-center">
            {[
              [t("barangay"), "BRGY-05"],
              [t("centre"), "EC-02"],
              [t("distance"), "650 m"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse gap-0.5 px-2 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      }
    />
  );
}
