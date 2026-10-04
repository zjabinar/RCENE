import { HouseIcon, LanguagesIcon, MapIcon, WifiOffIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { FeatureGrid } from "@rcene/kit/site";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "FeatureGrid",
  summary: {
    en: "What the site offers, as cards with an icon tile, a title and one line each. With href the whole card is one link and lifts on hover.",
    war: "An iginhahatag han site, sugad nga mga card nga may icon, titulo ngan usa nga linya. Kun may href, an bug-os nga card usa nga link.",
    fil: "Ang alok ng site, bilang mga card na may icon, pamagat at isang linya. Kapag may href, isang link ang buong card at umaangat kapag hover.",
  },
  blocks: ["FeatureGrid"],
  order: 40,
  frameHeight: 820,
};

const strings = {
  en: {
    map: "Hazard map",
    mapText: "Every mapped flood and landslide zone, with the three answers: in a zone, not in a zone, outside coverage.",
    plan: "Family plan",
    planText: "A go-bag checklist and a meeting point for your household, printable.",
    offline: "Works offline",
    offlineText: "Loads once, then runs with Wi-Fi off. Nothing to sign up for.",
    langs: "Three languages",
    langsText: "English, Winaray and Filipino, switchable on every screen.",
  },
  war: {
    map: "Mapa han peligro",
    mapText: "Kada zone han baha ngan pagtimpag nga aada ha mapa, upod an tulo nga baton.",
    plan: "Plano han pamilya",
    planText: "Checklist han go bag ngan tagbo-an para han imo panimalay, maiimprinta.",
    offline: "Naandar bisan offline",
    offlineText: "Usa la nga pag-load, dayon naandar bisan waray Wi-Fi.",
    langs: "Tulo nga pinulongan",
    langsText: "English, Winaray ngan Filipino, mababalhin ha kada screen.",
  },
  fil: {
    map: "Mapa ng panganib",
    mapText: "Bawat naka-mapang zone ng baha at pagguho, kasama ang tatlong sagot.",
    plan: "Plano ng pamilya",
    planText: "Checklist ng go bag at tagpuan para sa iyong sambahayan, maipi-print.",
    offline: "Gumagana offline",
    offlineText: "Isang beses mag-load, saka tatakbo kahit walang Wi-Fi.",
    langs: "Tatlong wika",
    langsText: "English, Winaray at Filipino, napapalitan sa bawat screen.",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    <FeatureGrid
      columns={4}
      items={[
        { icon: <MapIcon />, title: t("map"), description: t("mapText"), href: "#hazard-map" },
        { icon: <HouseIcon />, title: t("plan"), description: t("planText"), href: "#family-plan" },
        { icon: <WifiOffIcon />, title: t("offline"), description: t("offlineText") },
        { icon: <LanguagesIcon />, title: t("langs"), description: t("langsText") },
      ]}
    />
  );
}
