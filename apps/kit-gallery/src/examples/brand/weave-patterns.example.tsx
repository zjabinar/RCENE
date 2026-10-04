import { useT } from "@rcene/i18n";
import { WeavePattern, WEAVE_NAMES, type WeaveName } from "@rcene/kit/brand";
import { Button } from "@rcene/ui/components/button";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "WeavePattern",
  summary: {
    en: "Woven textures in the palette's weave colours behind heroes, section bands and poster borders. Text always sits on a solid panel above them.",
    war: "Mga hinabol nga tekstura ha kolor han habol luyo han hero, section band ngan border han poster. An teksto pirme ha solido nga panel ibabaw hini.",
    fil: "Mga hinabing tekstura sa kulay ng habi sa likod ng hero, section band at border ng poster. Laging nasa solidong panel sa ibabaw ang teksto.",
  },
  blocks: ["WeavePattern"],
  order: 20,
  frameHeight: 900,
};

const strings = {
  en: {
    eyebrow: "BRGY-05 · Saturday, 7:00",
    heading: "Weekly clean-up drive",
    lead: "Sign up for a shift. Bags and gloves at the barangay hall from 6:00.",
    join: "Join a shift",
    banig: "Plain over-under on the diagonal: the same weave as the mark. Section bands.",
    diamond: "The Basey banig motif, stepped diamonds. Quiet hero backgrounds.",
    stripes: "The banded border of a mat. Dividers and poster edges.",
    tikog: "A twill of tikog grass, diagonal ridges. Sidebars and cards.",
  },
  war: {
    eyebrow: "BRGY-05 · Sabado, 7:00",
    heading: "Semanal nga paglimpyo",
    lead: "Magpalista para ha shift. May bag ngan gwantes ha barangay hall tikang 6:00.",
    join: "Umupod ha shift",
    banig: "Simple nga ibabaw-ilarom nga habol ha diagonal: pareho han marka. Para ha section band.",
    diamond: "An motif han banig han Basey, mga diamante nga baytang. Para ha hero.",
    stripes: "An banda nga sidsid han banig. Para ha divider ngan sidsid han poster.",
    tikog: "Twill nga tikog, diagonal nga linya. Para ha sidebar ngan card.",
  },
  fil: {
    eyebrow: "BRGY-05 · Sabado, 7:00",
    heading: "Lingguhang paglilinis",
    lead: "Mag-sign up para sa shift. May bag at guwantes sa barangay hall mula 6:00.",
    join: "Sumali sa shift",
    banig: "Simpleng habing salit-salitan sa diagonal: kapareho ng marka. Para sa section band.",
    diamond: "Ang motif ng banig ng Basey, mga baitang na diyamante. Para sa tahimik na hero.",
    stripes: "Ang may-bandang gilid ng banig. Para sa divider at gilid ng poster.",
    tikog: "Twill ng tikog, mga diagonal na guhit. Para sa sidebar at card.",
  },
};

/** How strong each texture reads behind a swatch: bands can be bolder than backgrounds. */
const SWATCH_OPACITY: Record<WeaveName, number> = { banig: 0.55, diamond: 0.45, stripes: 0.6, tikog: 0.4 };

export function Example() {
  const t = useT(strings);
  return (
    <div className="flex flex-col gap-6">
      {/* A hero band: the pattern fills the section, the text sits on a card. */}
      <section aria-labelledby="weave-hero" className="relative isolate overflow-hidden rounded-2xl border bg-muted">
        <WeavePattern name="diamond" opacity={0.28} />
        <div className="relative m-4 max-w-md rounded-xl bg-card p-6 text-card-foreground shadow-raised sm:m-10">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">{t("eyebrow")}</p>
          <h2 id="weave-hero" className="mt-1 font-display text-display-3 font-semibold">
            {t("heading")}
          </h2>
          <p className="mt-2 text-muted-foreground">{t("lead")}</p>
          <Button className="mt-4">{t("join")}</Button>
        </div>
        <div aria-hidden="true" className="relative h-4">
          <WeavePattern name="banig" opacity={0.9} scale={0.6} />
        </div>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2">
        {WEAVE_NAMES.map((name) => (
          <li key={name} className="relative isolate flex min-h-40 items-end overflow-hidden rounded-xl border">
            <WeavePattern name={name} opacity={SWATCH_OPACITY[name]} />
            <div className="relative m-3 rounded-lg bg-card px-3 py-2 text-card-foreground shadow-raised">
              <p className="font-mono text-sm font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{t(name)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
