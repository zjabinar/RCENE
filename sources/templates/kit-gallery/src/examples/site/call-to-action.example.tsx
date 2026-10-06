import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { AppMark } from "@rcene/kit/brand";
import { CallToAction, SiteFooter } from "@rcene/kit/site";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "CallToAction · SiteFooter",
  summary: {
    en: "How a page ends: a prominent band with the next step (brand or showcase), then the footer with link columns, the preparedness disclaimer, Data sources and Back to top.",
    war: "Kon paonan-o natatapos an pahina: usa nga band nga may sunod nga lakang (brand o showcase), dayon an footer nga may mga link, an pahimangno, Data sources ngan Balik ha igbaw.",
    fil: "Paano nagtatapos ang pahina: isang band na may susunod na hakbang (brand o showcase), saka ang footer na may mga link, ang paalala, Data sources at Bumalik sa itaas.",
  },
  blocks: ["CallToAction", "SiteFooter"],
  order: 90,
  bleed: true,
  frameHeight: 900,
};

const strings = {
  en: {
    title: "Make your family plan today",
    body: "It takes ten minutes and works without signal. Print it for the fridge door.",
    start: "Start my plan",
    learn: "What goes in a go bag",
    liveTitle: "See it live on 7 October",
    liveBody: "Catbalogan City · RSCENE 2026",
    demo: "Open the demo",
    name: "Andam Catbalogan",
    note: "A preparedness prototype for the 57 barangays of Catbalogan City, built for the RSCENE 2026 challenge.",
    explore: "Explore",
    map: "Hazard map",
    plan: "Family plan",
    centres: "Evacuation centres",
    about: "About",
    how: "How it works",
    languages: "Languages",
    team: "Barangay teams",
  },
  war: {
    title: "Himoa an plano han imo pamilya yana",
    body: "Napulo ka minuto la ngan naandar bisan waray signal. Imprintaha para ha pultahan han ref.",
    start: "Tikanga an akon plano",
    learn: "Ano an sulod han go bag",
    liveTitle: "Kitaa ini live ha 7 Oktubre",
    demo: "Ablihi an demo",
    note: "Usa nga prototype han pagkaandam para ha 57 nga barangay han Syudad han Catbalogan, para ha RSCENE 2026.",
    explore: "Susiha",
    map: "Mapa han peligro",
    plan: "Plano han pamilya",
    centres: "Mga evacuation center",
    about: "Mahitungod",
    how: "Kon paonan-o naandar",
    languages: "Mga pinulongan",
    team: "Mga team han barangay",
  },
  fil: {
    title: "Gawin ang plano ng iyong pamilya ngayon",
    body: "Sampung minuto lang at gumagana kahit walang signal. I-print para sa pinto ng ref.",
    start: "Simulan ang aking plano",
    learn: "Ano ang laman ng go bag",
    liveTitle: "Panoorin nang live sa 7 Oktubre",
    demo: "Buksan ang demo",
    note: "Isang prototype ng kahandaan para sa 57 barangay ng Lungsod ng Catbalogan, para sa RSCENE 2026.",
    explore: "Galugarin",
    map: "Mapa ng panganib",
    plan: "Plano ng pamilya",
    centres: "Mga evacuation center",
    about: "Tungkol dito",
    how: "Paano ito gumagana",
    languages: "Mga wika",
    team: "Mga team ng barangay",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    <div>
      <CallToAction
        title={t("title")}
        body={t("body")}
        actions={
          <>
            <Button size="lg" variant="secondary" asChild>
              <a href="#plan">
                {t("start")}
                <ArrowRightIcon aria-hidden="true" />
              </a>
            </Button>
            <Button size="lg" variant="ghost" className="text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground" asChild>
              <a href="#go-bag">{t("learn")}</a>
            </Button>
          </>
        }
      />
      <CallToAction
        tone="showcase"
        title={t("liveTitle")}
        body={t("liveBody")}
        className="pt-0 sm:pt-0"
        actions={
          <Button size="lg" asChild>
            <a href="#demo">
              <PlayIcon aria-hidden="true" />
              {t("demo")}
            </a>
          </Button>
        }
      />
      <SiteFooter
        brand={
          <>
            <AppMark size={32} />
            {t("name")}
          </>
        }
        note={t("note")}
        columns={[
          {
            title: t("explore"),
            links: [
              { to: "#hazard-map", label: t("map") },
              { to: "#family-plan", label: t("plan") },
              { to: "#centres", label: t("centres") },
            ],
          },
          {
            title: t("about"),
            links: [
              { to: "#how", label: t("how") },
              { to: "#languages", label: t("languages") },
              { to: "#teams", label: t("team") },
            ],
          },
        ]}
      />
    </div>
  );
}
