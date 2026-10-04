import { MapPinIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { IllustratedState } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "IllustratedState",
  summary: {
    en: "Empty, no-match, offline, error, done and 'pick a place' states: a calm woven drawing, one line of words and the one action that helps.",
    war: "Mga estado nga empty, waray kapareho, offline, error, human na ngan 'pili hin lugar': kalmado nga drowing, usa nga linya nga pulong ngan an usa nga aksyon nga makakabulig.",
    fil: "Mga estadong empty, walang tugma, offline, error, tapos na at 'pumili ng lugar': mahinahong guhit, isang linya ng salita at ang isang aksyong nakakatulong.",
  },
  blocks: ["IllustratedState"],
  order: 100,
  frameHeight: 1400,
};

const strings = {
  en: {
    emptyTitle: "No requests yet",
    emptyLead: "Requests filed at BRGY-05 show up here, newest first.",
    add: "New request",
    searchTitle: "No match for “REC-9”",
    searchLead: "Check the code, or search by barangay.",
    clear: "Clear search",
    offlineTitle: "You are offline",
    offlineLead: "Everything here still works. New requests are kept on this device.",
    errorTitle: "The list did not load",
    errorLead: "Try again; your saved requests are not affected.",
    retry: "Try again",
    doneTitle: "All requests answered",
    doneLead: "Nothing is waiting for a team right now.",
    mapTitle: "Pick a place on the map",
    mapLead: "Tap the map or choose a barangay.",
    locate: "Choose a barangay",
  },
  war: {
    emptyTitle: "Waray pa hangyo",
    emptyLead: "Makikita dinhi an mga hangyo ha BRGY-05, an pinakabag-o una.",
    add: "Bag-o nga hangyo",
    searchTitle: "Waray kapareho an “REC-9”",
    searchLead: "Kitaa an code, o bilnga pinaagi han barangay.",
    clear: "Panasa an ginbibiling",
    offlineTitle: "Offline ka",
    offlineLead: "Nagana gihapon an ngatanan dinhi. Gintitipig ha ini nga device an bag-o nga mga hangyo.",
    errorTitle: "Waray mag-load an listahan",
    errorLead: "Utroha; diri apektado an imo natipig nga mga hangyo.",
    retry: "Utroha",
    doneTitle: "Nasabtan na an ngatanan nga hangyo",
    doneLead: "Waray naghuhulat hin team yana.",
    mapTitle: "Pili hin lugar ha mapa",
    mapLead: "Pinduta an mapa o pili hin barangay.",
    locate: "Pili hin barangay",
  },
  fil: {
    emptyTitle: "Wala pang kahilingan",
    emptyLead: "Lalabas dito ang mga kahilingan sa BRGY-05, pinakabago muna.",
    add: "Bagong kahilingan",
    searchTitle: "Walang tugma sa “REC-9”",
    searchLead: "Suriin ang code, o maghanap ayon sa barangay.",
    clear: "Burahin ang hinahanap",
    offlineTitle: "Offline ka",
    offlineLead: "Gumagana pa rin ang lahat dito. Nakatago sa device na ito ang mga bagong kahilingan.",
    errorTitle: "Hindi na-load ang listahan",
    errorLead: "Subukan muli; hindi apektado ang iyong mga naka-save na kahilingan.",
    retry: "Subukan muli",
    doneTitle: "Nasagot na ang lahat ng kahilingan",
    doneLead: "Walang naghihintay ng team ngayon.",
    mapTitle: "Pumili ng lugar sa mapa",
    mapLead: "I-tap ang mapa o pumili ng barangay.",
    locate: "Pumili ng barangay",
  },
};

const CARD = "rounded-xl border bg-card text-card-foreground shadow-raised";

export function Example() {
  const t = useT(strings);
  return (
    <div className="flex flex-col gap-4">
      <div className={CARD}>
        <IllustratedState
          spot="empty"
          title={t("emptyTitle")}
          description={t("emptyLead")}
          actions={
            <Button>
              <PlusIcon aria-hidden="true" />
              {t("add")}
            </Button>
          }
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={CARD}>
          <IllustratedState
            spot="search"
            size="sm"
            title={t("searchTitle")}
            description={t("searchLead")}
            actions={
              <Button size="sm" variant="outline">
                <XIcon aria-hidden="true" />
                {t("clear")}
              </Button>
            }
          />
        </div>
        <div className={CARD}>
          <IllustratedState spot="offline" size="sm" title={t("offlineTitle")} description={t("offlineLead")} />
        </div>
        <div className={CARD}>
          <IllustratedState
            spot="error"
            size="sm"
            title={t("errorTitle")}
            description={t("errorLead")}
            actions={
              <Button size="sm" variant="outline">
                <RotateCcwIcon aria-hidden="true" />
                {t("retry")}
              </Button>
            }
          />
        </div>
        <div className={CARD}>
          <IllustratedState spot="done" size="sm" title={t("doneTitle")} description={t("doneLead")} />
        </div>
        <div className={`${CARD} sm:col-span-2 lg:col-span-2`}>
          <IllustratedState
            spot="map"
            size="sm"
            title={t("mapTitle")}
            description={t("mapLead")}
            actions={
              <Button size="sm">
                <MapPinIcon aria-hidden="true" />
                {t("locate")}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
