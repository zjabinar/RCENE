import { useLayoutEffect, useRef, useState } from "react";
import { useT } from "@rcene/i18n";
import { Surface } from "@rcene/kit";
import { OgCard } from "@rcene/kit/brand";
import { ToggleGroup, ToggleGroupItem } from "@rcene/ui/components/toggle-group";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "OgCard",
  summary: {
    en: "The 1200 × 630 social card: the image behind public/og.png and the app tile on the poster. Render it alone on a route and screenshot it.",
    war: "An 1200 × 630 nga social card: an hulagway han public/og.png ngan an tile han app ha poster.",
    fil: "Ang 1200 × 630 na social card: ang larawan ng public/og.png at ang tile ng app sa poster.",
  },
  blocks: ["OgCard"],
  order: 40,
  frameHeight: 560,
};

const strings = {
  en: {
    title: "Pila",
    tagline: "Take a number at the barangay hall and watch the board from your phone.",
    look: "Look",
    calm: "Calm",
    showcase: "Showcase",
    regenerate: "Shown here at a fraction of its size. To make this app's public/og.png from project.json:",
    fromRoute: "Or screenshot this card from a route in any theme while npm run dev is running:",
  },
  war: {
    tagline: "Kumuha hin numero ha barangay hall ngan bantayi an board tikang ha imo telepono.",
    look: "Itsura",
    calm: "Kalmado",
    regenerate: "Gin-gutiay dinhi. Para himoon an public/og.png hini nga app tikang ha project.json:",
    fromRoute: "O i-screenshot ini nga card tikang ha route ha bisan ano nga tema samtang nadalagan an npm run dev:",
  },
  fil: {
    tagline: "Kumuha ng numero sa barangay hall at bantayan ang board mula sa iyong telepono.",
    look: "Itsura",
    calm: "Mahinahon",
    regenerate: "Pinaliit dito. Para gawin ang public/og.png ng app na ito mula sa project.json:",
    fromRoute: "O i-screenshot ang card na ito mula sa isang route sa anumang tema habang tumatakbo ang npm run dev:",
  },
};

const CARD_WIDTH = 1200;

/** Scales a fixed-width child to the container's width (the card keeps its 1200 x 630 layout). */
function useFitScale(width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / width);
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  return [ref, scale] as const;
}

export function Example() {
  const t = useT(strings);
  const [look, setLook] = useState<"calm" | "showcase">("calm");
  const [ref, scale] = useFitScale(CARD_WIDTH);
  const card = <OgCard title={t("title")} tagline={t("tagline")} appId="07" />;

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        aria-label={t("look")}
        value={look}
        onValueChange={(v) => v && setLook(v as "calm" | "showcase")}
        className="self-start"
      >
        <ToggleGroupItem value="calm">{t("calm")}</ToggleGroupItem>
        <ToggleGroupItem value="showcase">{t("showcase")}</ToggleGroupItem>
      </ToggleGroup>

      <div ref={ref} className="relative aspect-[40/21] w-full overflow-hidden rounded-xl border shadow-raised">
        <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
          {look === "showcase" ? <Surface variant="showcase">{card}</Surface> : card}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>{t("regenerate")}</p>
        <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap text-foreground">
          <code>node scripts/brand-assets.mjs --only og</code>
        </pre>
        <p>{t("fromRoute")}</p>
        <pre className="rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap text-foreground">
          <code>{`{ path: "/og", element: <OgCard title={t("app.title")} tagline={t("app.tagline")} appId="07" /> }\nnode scripts/brand-assets.mjs --only og --url http://localhost:5107/og`}</code>
        </pre>
      </div>
    </div>
  );
}
