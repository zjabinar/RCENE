import { DownloadIcon, PlusIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "PageHeader",
  summary: {
    en: "The top of every route: breadcrumbs, a kicker, the page's h1, one line of context and the page's main actions.",
    war: "An ibabaw han kada ruta: breadcrumbs, kicker, an h1 han pahina, usa nga linya nga konteksto ngan an mga panguna nga aksyon.",
    fil: "Ang itaas ng bawat ruta: breadcrumbs, kicker, ang h1 ng pahina, isang linya ng konteksto at ang mga pangunahing aksyon.",
  },
  blocks: ["PageHeader"],
  order: 10,
  frameHeight: 520,
};

const strings = {
  en: {
    home: "Home",
    requests: "Requests",
    eyebrow: "Barangay desk",
    title: "Requests at BRGY-05",
    lead: "Every request filed this week, newest first. Open one to see where it stands.",
    export: "Export CSV",
    add: "New request",
  },
  war: {
    home: "Puno",
    requests: "Mga hangyo",
    eyebrow: "Desk han barangay",
    title: "Mga hangyo ha BRGY-05",
    lead: "An ngatanan nga hangyo yana nga semana, an pinakabag-o una. Ablihi an usa basi makita kun aadi na ini.",
    export: "I-export an CSV",
    add: "Bag-o nga hangyo",
  },
  fil: {
    home: "Home",
    requests: "Mga kahilingan",
    eyebrow: "Desk ng barangay",
    title: "Mga kahilingan sa BRGY-05",
    lead: "Lahat ng kahilingan ngayong linggo, pinakabago muna. Buksan ang isa para makita kung nasaan na ito.",
    export: "I-export ang CSV",
    add: "Bagong kahilingan",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    <PageHeader
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lead")}
      breadcrumbs={[{ label: t("home"), to: "#" }, { label: t("requests"), to: "#requests" }, { label: "BRGY-05" }]}
      actions={
        <>
          <Button variant="outline">
            <DownloadIcon aria-hidden="true" />
            {t("export")}
          </Button>
          <Button>
            <PlusIcon aria-hidden="true" />
            {t("add")}
          </Button>
        </>
      }
      className="pb-0 sm:pb-0"
    />
  );
}
