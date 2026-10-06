import { useT } from "@rcene/i18n";
import { BeforeAfter } from "@rcene/kit/site";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "BeforeAfter",
  summary: {
    en: "Compare two states of one place: drag the divider, click the frame or use the arrow keys. Works with photos, maps or any node of the same size.",
    war: "Ikumpara an duha nga kahimtang han usa nga lugar: i-drag an divider, pinduta an frame o gamita an arrow keys. Naandar ha litrato, mapa o bisan ano nga node.",
    fil: "Ihambing ang dalawang kalagayan ng isang lugar: i-drag ang divider, i-click ang frame o gamitin ang arrow keys. Gumagana sa larawan, mapa o anumang node.",
  },
  blocks: ["BeforeAfter"],
  order: 70,
  frameHeight: 520,
};

const strings = {
  en: {
    before: "2019",
    after: "2024",
    beforeAlt: "The bay front in 2019: houses close to a bare shoreline.",
    afterAlt: "The bay front in 2024: a sea wall and a belt of young mangroves between the houses and the water.",
  },
  war: {
    beforeAlt: "An baybayon han 2019: mga balay hirani ha waray tanom nga baybayon.",
    afterAlt: "An baybayon han 2024: may sea wall ngan bakhawan ha butnga han mga balay ngan han tubig.",
  },
  fil: {
    beforeAlt: "Ang baybayin noong 2019: mga bahay malapit sa hubad na dalampasigan.",
    afterAlt: "Ang baybayin noong 2024: may sea wall at bakawan sa pagitan ng mga bahay at ng tubig.",
  },
};

const HOUSES = [60, 130, 200, 270, 340, 410, 480, 550];

/** A schematic bay front in theme tokens; `after` adds the sea wall and mangroves. */
function BayFront({ after, label }: { after: boolean; label: string }) {
  return (
    <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="size-full">
      <rect width="640" height="360" className="fill-highlight" />
      <path d="M0 210 C 120 196, 260 222, 380 204 S 560 196, 640 206 L 640 360 L 0 360 Z" className="fill-seq-3" />
      <path d="M0 250 C 140 238, 300 262, 440 246 S 580 240, 640 248" fill="none" strokeWidth="3" className="stroke-seq-2" opacity="0.7" />
      <path d="M0 196 C 120 182, 260 208, 380 190 S 560 182, 640 192 L 640 0 L 0 0 Z" className="fill-secondary" />
      {HOUSES.map((x, i) => (
        <g key={x} transform={`translate(${x} ${124 + (i % 2) * 10})`}>
          <rect x="-18" y="0" width="36" height="28" rx="2" className="fill-card stroke-border" strokeWidth="2" />
          <path d="M-24 2 L0 -18 L24 2 Z" className="fill-brand" opacity="0.85" />
        </g>
      ))}
      {after && (
        <>
          <rect x="0" y="182" width="640" height="10" className="fill-muted-foreground" opacity="0.55" />
          {Array.from({ length: 16 }, (_, i) => (
            <g key={i} transform={`translate(${24 + i * 40} ${206 + (i % 3) * 6})`}>
              <path d="M0 0 v16" strokeWidth="3" className="stroke-chart-5" />
              <circle cx="0" cy="-4" r="13" className="fill-chart-4" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

export function Example() {
  const t = useT(strings);
  return (
    <div className="mx-auto max-w-3xl">
      <BeforeAfter
        before={<BayFront after={false} label={t("beforeAlt")} />}
        after={<BayFront after label={t("afterAlt")} />}
        beforeLabel={t("before")}
        afterLabel={t("after")}
        initial={45}
        className="aspect-video"
      />
    </div>
  );
}
