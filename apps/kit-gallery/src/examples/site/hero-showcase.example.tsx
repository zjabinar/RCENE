import { PlayIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { Hero } from "@rcene/kit/site";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "Hero · showcase",
  summary: {
    en: "The dark neon opening for the demo and the event page: Exo 2 italic, a glowing gradient title over a slowly drifting grid (still under reduced motion).",
    war: "An madulom nga neon nga pagtikang para ha demo ngan event page: Exo 2 italic, nasiga nga gradient nga titulo ibabaw han hinay nga naglalakat nga grid (diri nagliligid kun reduced motion).",
    fil: "Ang madilim na neon na simula para sa demo at event page: Exo 2 italic, kumikinang na gradient na pamagat sa ibabaw ng dahan-dahang gumagalaw na grid (tahimik kapag reduced motion).",
  },
  blocks: ["Hero"],
  order: 20,
  bleed: true,
  frameHeight: 900,
};

const strings = {
  en: {
    eyebrow: "RSCENE 2026 · Live demo",
    title: "Every barangay, one woven response",
    lead: "Residents check in by household code, barangay teams see who still needs help, and the city board updates live, with Wi-Fi off.",
    watch: "Watch the demo",
    poster: "Read the poster",
    live: "Live · EC-02",
    checkedIn: "households checked in",
    centres: "Evacuation centres",
  },
  war: {
    eyebrow: "RSCENE 2026 · Live nga demo",
    title: "Kada barangay, usa nga hinabol nga pagtubag",
    lead: "Nagcha-check in an mga residente gamit an code han panimalay, nakikita han barangay team kun hin-o pa an nagkikinahanglan hin bulig, ngan nag-a-update an board han syudad bisan waray Wi-Fi.",
    watch: "Kitaa an demo",
    poster: "Basaha an poster",
    checkedIn: "nga panimalay an naka-check in",
    centres: "Mga evacuation center",
  },
  fil: {
    eyebrow: "RSCENE 2026 · Live na demo",
    title: "Bawat barangay, iisang hinabing tugon",
    lead: "Nagche-check in ang mga residente gamit ang code ng sambahayan, nakikita ng barangay team kung sino pa ang nangangailangan ng tulong, at nag-a-update ang board ng lungsod kahit walang Wi-Fi.",
    watch: "Panoorin ang demo",
    poster: "Basahin ang poster",
    checkedIn: "sambahayan ang naka-check in",
    centres: "Mga evacuation center",
  },
};

const CENTRES = [
  { code: "EC-01", n: 42 },
  { code: "EC-02", n: 128 },
  { code: "EC-03", n: 17 },
];

export function Example() {
  const t = useT(strings);
  const fmt = useFormat();
  return (
    <Hero
      variant="showcase"
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      actions={
        <>
          <Button size="lg" asChild>
            <a href="#demo">
              <PlayIcon aria-hidden="true" />
              {t("watch")}
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#poster">{t("poster")}</a>
          </Button>
        </>
      }
      media={
        <div className="flex flex-col gap-5 p-6">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary shadow-glow" />
            {t("live")}
          </p>
          <p className="flex flex-col">
            <span className="text-board-2 font-bold text-foreground tabular-nums">
              {fmt.number(128)} <span className="text-muted-foreground">/ {fmt.number(160)}</span>
            </span>
            <span className="text-sm text-muted-foreground">{t("checkedIn")}</span>
          </p>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-4/5 rounded-full bg-linear-to-r from-primary to-brand" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("centres")}</p>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {CENTRES.map((c) => (
                <li key={c.code} className="rounded-lg border bg-background/60 px-3 py-2">
                  <span className="block font-mono text-xs text-muted-foreground">{c.code}</span>
                  <span className="text-lg font-semibold tabular-nums">{fmt.number(c.n)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
    />
  );
}
