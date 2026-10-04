import { PlusIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { SPOT_NAMES, SpotIllustration } from "@rcene/kit/brand";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "SpotIllustration",
  summary: {
    en: "Calm woven line drawings that set the tone of an empty, search, offline, error or done state, or of a map, community or heritage section. The text says what happened.",
    war: "Kalmado nga mga drowing para ha empty, search, offline, error o done nga estado, o ha seksyon han mapa, komunidad o kabilin. An teksto an nagsasaysay.",
    fil: "Mahinahong mga guhit para sa empty, search, offline, error o done na estado, o sa seksyon ng mapa, komunidad o pamana. Ang teksto ang nagsasabi.",
  },
  blocks: ["SpotIllustration"],
  order: 30,
  frameHeight: 980,
};

const strings = {
  en: {
    emptyTitle: "No requests yet",
    emptyLead: "Requests filed at BRGY-05 this week show up here, newest first.",
    newRequest: "New request",
    all: "All eight drawings",
    empty: "Nothing here yet",
    search: "No match for the search",
    offline: "Offline: still works",
    error: "Something came undone",
    done: "Saved, all done",
    map: "Places and routes",
    community: "Neighbours, bayanihan",
    heritage: "Heritage and history",
  },
  war: {
    emptyTitle: "Waray pa hangyo",
    emptyLead: "Makikita dinhi an mga hangyo ha BRGY-05 yana nga semana, an pinakabag-o una.",
    newRequest: "Bag-o nga hangyo",
    all: "An walo nga drowing",
    empty: "Waray pa sulod",
    search: "Waray kapareho ha pagbiling",
    offline: "Offline: nagana gihapon",
    error: "May nabungkag",
    done: "Natipig na, human na",
    map: "Mga lugar ngan rota",
    community: "Mga kasilingan, bayanihan",
    heritage: "Kabilin ngan kasaysayan",
  },
  fil: {
    emptyTitle: "Wala pang kahilingan",
    emptyLead: "Lalabas dito ang mga kahilingan sa BRGY-05 ngayong linggo, pinakabago muna.",
    newRequest: "Bagong kahilingan",
    all: "Lahat ng walong guhit",
    empty: "Wala pang laman",
    search: "Walang tugma sa paghahanap",
    offline: "Offline: gumagana pa rin",
    error: "May nasira",
    done: "Naka-save, tapos na",
    map: "Mga lugar at ruta",
    community: "Mga kapitbahay, bayanihan",
    heritage: "Pamana at kasaysayan",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    <div className="flex flex-col gap-8">
      {/* An empty state built with the drawing: picture, then the words, then the one action. */}
      <section
        aria-labelledby="spot-empty"
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-card-foreground"
      >
        <SpotIllustration name="empty" size={176} />
        <h2 id="spot-empty" className="font-display text-xl font-semibold">
          {t("emptyTitle")}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t("emptyLead")}</p>
        <Button className="mt-2">
          <PlusIcon aria-hidden="true" />
          {t("newRequest")}
        </Button>
      </section>

      <section aria-labelledby="spot-all" className="flex flex-col gap-3">
        <h2 id="spot-all" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("all")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SPOT_NAMES.map((name) => (
            <li key={name}>
              <figure className="flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center text-card-foreground">
                <SpotIllustration name={name} size={128} />
                <figcaption className="flex flex-col">
                  <span className="font-mono text-xs font-semibold">{name}</span>
                  <span className="text-xs text-muted-foreground">{t(name)}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
