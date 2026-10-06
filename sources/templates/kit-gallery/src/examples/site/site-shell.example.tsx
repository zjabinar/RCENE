import { ArrowRightIcon, HouseIcon, MapIcon, WifiOffIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { AppMark } from "@rcene/kit/brand";
import { FeatureGrid, Hero, Section, SiteLink, SiteShell } from "@rcene/kit/site";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "SiteShell · SiteLink",
  summary: {
    en: "The frame of a landing or story page: skip link, a top bar that turns solid once you scroll, nav, theme and language menus (a menu sheet on phones), main and the footer. Scroll inside the box to see the bar change.",
    war: "An frame han landing o story nga pahina: skip link, top bar nga nagigin solido kun nag-i-scroll, nav, menu han tema ngan pinulongan (menu sheet ha telepono), main ngan footer.",
    fil: "Ang frame ng landing o story na pahina: skip link, top bar na nagiging solido kapag nag-scroll, nav, menu ng tema at wika (menu sheet sa telepono), main at footer.",
  },
  blocks: ["SiteShell", "SiteLink"],
  order: 100,
  frameHeight: 680,
};

const strings = {
  en: {
    box: "Website preview (scrolls)",
    site: "Andam Catbalogan",
    features: "Features",
    plan: "Family plan",
    open: "Make a plan",
    eyebrow: "BRGY-05 · Preparedness",
    title: "Ready before the rain",
    lead: "Your barangay's hazard map, nearest evacuation centre and family plan, offline.",
    featuresTitle: "What you can do here",
    map: "See your zone",
    mapText: "The three answers for your address: in a zone, not in a zone, outside coverage.",
    bag: "Pack a go bag",
    bagText: "A checklist sized for your household.",
    offline: "Use it offline",
    offlineText: "Everything loads once, then works with Wi-Fi off.",
    planTitle: "Your family plan",
    planLead: "Agree on a meeting point and print the plan for the fridge door.",
  },
  war: {
    box: "Preview han website (nag-i-scroll)",
    features: "Mga feature",
    plan: "Plano han pamilya",
    open: "Paghimo hin plano",
    eyebrow: "BRGY-05 · Pagkaandam",
    title: "Andam antes han uran",
    lead: "An mapa han peligro han imo barangay, an pinakahirani nga evacuation center ngan plano han pamilya, offline.",
    featuresTitle: "Ano an mahihimo mo didi",
    map: "Kitaa an imo zone",
    bag: "Pag-andam hin go bag",
    offline: "Gamita bisan offline",
    planTitle: "An plano han imo pamilya",
    planLead: "Pagkasabutan an tagbo-an ngan imprintaha an plano para ha pultahan han ref.",
  },
  fil: {
    box: "Preview ng website (nag-i-scroll)",
    features: "Mga feature",
    plan: "Plano ng pamilya",
    open: "Gumawa ng plano",
    eyebrow: "BRGY-05 · Kahandaan",
    title: "Handa bago umulan",
    lead: "Ang mapa ng panganib ng iyong barangay, ang pinakamalapit na evacuation center at plano ng pamilya, offline.",
    featuresTitle: "Ang magagawa mo rito",
    map: "Tingnan ang iyong zone",
    bag: "Maghanda ng go bag",
    offline: "Gamitin offline",
    planTitle: "Ang plano ng iyong pamilya",
    planLead: "Magkasundo sa tagpuan at i-print ang plano para sa pinto ng ref.",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    // A shell is a whole page; here it scrolls inside a box, so it leaves the document title alone.
    <div role="region" aria-label={t("box")} tabIndex={0} className="h-[36rem] overflow-y-auto overscroll-contain rounded-xl border">
      <SiteShell
        title={t("site")}
        brand={<AppMark size={32} />}
        embedded
        nav={[
          { to: "#shell-features", label: t("features") },
          { to: "#shell-plan", label: t("plan") },
        ]}
        actions={
          <Button size="sm" asChild>
            <SiteLink to="#shell-plan">
              {t("open")}
              <ArrowRightIcon aria-hidden="true" />
            </SiteLink>
          </Button>
        }
      >
        <Hero eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
        <Section id="shell-features" title={t("featuresTitle")}>
          <FeatureGrid
            items={[
              { icon: <MapIcon />, title: t("map"), description: t("mapText") },
              { icon: <HouseIcon />, title: t("bag"), description: t("bagText") },
              { icon: <WifiOffIcon />, title: t("offline"), description: t("offlineText") },
            ]}
          />
        </Section>
        <Section id="shell-plan" tone="muted" title={t("planTitle")} lead={t("planLead")} />
      </SiteShell>
    </div>
  );
}
