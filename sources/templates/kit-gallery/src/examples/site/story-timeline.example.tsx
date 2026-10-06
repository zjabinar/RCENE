import { LandmarkIcon, SmartphoneIcon, UsersIcon, WavesIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { StoryTimeline } from "@rcene/kit/site";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "StoryTimeline",
  summary: {
    en: "A story told in dates, as an ordered list. The line draws itself as you scroll and each marker lights up when reached; complete at once under reduced motion.",
    war: "Istorya nga gin-asoy ha mga petsa, sugad nga nahan-ay nga lista. Nagdudrowing an linya samtang nag-i-scroll ka; bug-os dayon kun reduced motion.",
    fil: "Kuwentong isinalaysay sa mga petsa, bilang nakaayos na listahan. Gumuguhit ang linya habang nag-i-scroll; buo agad kapag reduced motion.",
  },
  blocks: ["StoryTimeline"],
  order: 80,
  frameHeight: 900,
};

const strings = {
  en: {
    label: "Catbalogan's preparedness, 1987 to 2026",
    d1: "1987",
    t1: "The first flood map",
    b1: "Drawn by hand at the city hall from what residents remembered of past floods.",
    d2: "Nov 2013",
    t2: "Typhoon Yolanda",
    b2: "The storm surge reaches the bay front. The city rebuilds its warning system.",
    d3: "2020",
    t3: "A team in every barangay",
    b3: "Each of the 57 barangays names a response team and a meeting point.",
    d4: "Oct 2026",
    t4: "Maps in every pocket",
    b4: "Offline hazard maps and family plans, in English, Winaray and Filipino.",
  },
  war: {
    label: "An pagkaandam han Catbalogan, 1987 tubtob 2026",
    d2: "Nob 2013",
    d4: "Okt 2026",
    t1: "An siyahan nga mapa han baha",
    b1: "Gindrowing ha kamot ha munisipyo tikang ha nahinumduman han mga residente.",
    t2: "Bagyo Yolanda",
    b2: "Inabot han storm surge an baybayon. Ginbag-o han syudad an iya sistema han pahimangno.",
    t3: "Usa nga team ha kada barangay",
    b3: "An kada usa han 57 nga barangay nagtudlo hin response team ngan tagbo-an.",
    t4: "Mapa ha kada bulsa",
    b4: "Offline nga mapa han peligro ngan plano han pamilya, ha English, Winaray ngan Filipino.",
  },
  fil: {
    label: "Ang kahandaan ng Catbalogan, 1987 hanggang 2026",
    d2: "Nob 2013",
    d4: "Okt 2026",
    t1: "Ang unang mapa ng baha",
    b1: "Iginuhit sa kamay sa city hall mula sa naaalala ng mga residente.",
    t2: "Bagyong Yolanda",
    b2: "Inabot ng storm surge ang baybayin. Binago ng lungsod ang sistema ng babala.",
    t3: "Isang team sa bawat barangay",
    b3: "Bawat isa sa 57 barangay ay nagtalaga ng response team at tagpuan.",
    t4: "Mapa sa bawat bulsa",
    b4: "Offline na mapa ng panganib at plano ng pamilya, sa English, Winaray at Filipino.",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    <StoryTimeline
      label={t("label")}
      headingLevel={2}
      items={[
        { id: "1987", date: t("d1"), title: t("t1"), body: <p>{t("b1")}</p>, icon: <LandmarkIcon /> },
        { id: "2013", date: t("d2"), title: t("t2"), body: <p>{t("b2")}</p>, icon: <WavesIcon /> },
        { id: "2020", date: t("d3"), title: t("t3"), body: <p>{t("b3")}</p>, icon: <UsersIcon /> },
        { id: "2026", date: t("d4"), title: t("t4"), body: <p>{t("b4")}</p>, icon: <SmartphoneIcon /> },
      ]}
    />
  );
}
