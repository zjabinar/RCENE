import { useT } from "@rcene/i18n";
import { Section, WeaveDivider } from "@rcene/kit/site";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "Section · WeaveDivider",
  summary: {
    en: "Page sections with one vertical rhythm, an eyebrow, a display h2 and a lead, in four tones; woven dividers (band, wave, diamond) mark the breaks between them.",
    war: "Mga seksyon han pahina nga may usa nga ritmo, eyebrow, display nga h2 ngan lead, ha upat nga tono; an hinabol nga divider (band, wave, diamond) nagmamarka han pagbulag.",
    fil: "Mga seksiyon ng pahina na may iisang ritmo, eyebrow, display na h2 at lead, sa apat na tono; minamarkahan ng hinabing divider (band, wave, diamond) ang pagitan.",
  },
  blocks: ["Section", "WeaveDivider"],
  order: 30,
  bleed: true,
  frameHeight: 900,
};

const strings = {
  en: {
    defaultEyebrow: "tone=\"default\"",
    defaultTitle: "Plan before the rain",
    defaultLead: "Three steps any household can finish in ten minutes: know your zone, pack a go bag, agree on a meeting point.",
    mutedEyebrow: "tone=\"muted\" · align=\"center\"",
    mutedTitle: "Built with the barangays",
    mutedLead: "Every screen was tested with BRGY-05 and BRGY-12 response teams.",
    weaveEyebrow: "tone=\"weave\"",
    weaveTitle: "Woven from local knowledge",
    weaveLead: "Old flood marks, heritage sites and today's maps, in one place.",
    showcaseEyebrow: "tone=\"showcase\"",
    showcaseTitle: "See it live on 7 October",
    showcaseLead: "The same section in the neon showcase look, for the demo page.",
  },
  war: {
    defaultTitle: "Pagplano antes han uran",
    defaultLead: "Tulo nga lakang nga mahuhuman han kada panimalay ha napulo ka minuto: hibaroa an imo zone, pag-andam hin go bag, pagkasabutan an tagbo-an.",
    mutedTitle: "Ginhimo upod an mga barangay",
    mutedLead: "Gin-testing an kada screen upod an response team han BRGY-05 ngan BRGY-12.",
    weaveTitle: "Hinabol tikang ha lokal nga kinaadman",
    weaveLead: "Daan nga marka han baha, heritage site ngan mapa yana, ha usa nga lugar.",
    showcaseTitle: "Kitaa ini live ha 7 Oktubre",
    showcaseLead: "Pareho nga seksyon ha neon nga showcase, para ha demo nga pahina.",
  },
  fil: {
    defaultTitle: "Magplano bago umulan",
    defaultLead: "Tatlong hakbang na matatapos ng bawat sambahayan sa sampung minuto: alamin ang zone, maghanda ng go bag, magkasundo sa tagpuan.",
    mutedTitle: "Ginawa kasama ang mga barangay",
    mutedLead: "Sinubok ang bawat screen kasama ang response team ng BRGY-05 at BRGY-12.",
    weaveTitle: "Hinabi mula sa lokal na kaalaman",
    weaveLead: "Mga lumang marka ng baha, heritage site at mapa ngayon, sa iisang lugar.",
    showcaseTitle: "Panoorin nang live sa 7 Oktubre",
    showcaseLead: "Parehong seksiyon sa neon na showcase, para sa demo na pahina.",
  },
};

/** Tighter than the page default so four tones fit one preview; drop `className` on a real page. */
const COMPACT = "py-10 sm:py-12 lg:py-14";

export function Example() {
  const t = useT(strings);
  return (
    <div>
      <Section eyebrow={t("defaultEyebrow")} title={t("defaultTitle")} lead={t("defaultLead")} className={COMPACT} />
      <WeaveDivider variant="band" />
      <Section tone="muted" align="center" eyebrow={t("mutedEyebrow")} title={t("mutedTitle")} lead={t("mutedLead")} className={COMPACT} />
      <WeaveDivider variant="diamond" className="bg-muted/60" />
      <Section tone="weave" eyebrow={t("weaveEyebrow")} title={t("weaveTitle")} lead={t("weaveLead")} className={COMPACT}>
        <WeaveDivider variant="wave" className="justify-start" />
      </Section>
      <Section tone="showcase" eyebrow={t("showcaseEyebrow")} title={t("showcaseTitle")} lead={t("showcaseLead")} className={COMPACT} />
    </div>
  );
}
