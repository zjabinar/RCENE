import { CheckIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { ScrollyChapter } from "@rcene/kit/site";
import { cn } from "@rcene/ui/lib/utils";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "ScrollyChapter",
  summary: {
    en: "Scrollytelling: a sticky figure beside the step cards (behind them on phones) that changes with the step in view. Steps are focusable, move with the arrow keys and are announced. Here it runs in a scroll box with height set.",
    war: "Scrollytelling: usa nga nakapirme nga figure kilid han mga card han lakang (luyo hini ha telepono) nga nagbabag-o kada lakang. Napipili an mga lakang, nababalhin gamit an arrow keys ngan ginpapahibaro.",
    fil: "Scrollytelling: isang nakapirmeng figure sa tabi ng mga card ng hakbang (sa likod nito sa telepono) na nagbabago sa bawat hakbang. Napipili ang mga hakbang, gumagalaw sa arrow keys at inaanunsiyo.",
  },
  blocks: ["ScrollyChapter"],
  order: 60,
  frameHeight: 640,
};

const strings = {
  en: {
    box: "Story: one evening of heavy rain (scrolls)",
    s0: "Rain in the uplands",
    b0: "Three hours of heavy rain upstream. The river is still within its banks.",
    s1: "The river rises",
    b1: "Water spreads past the banks. BRGY-02 and BRGY-03 sit in the mapped flood zone along the river.",
    s2: "Teams open the centres",
    b2: "Response teams open EC-01 and EC-02 and walk households from both barangays to them.",
    s3: "Everyone checked in",
    b3: "Households check in by code at the centres. The board shows nobody still waiting.",
    f0: "Map of four barangays along the river: rain over the uplands, the river within its banks.",
    f1: "Map: the river has spread into the flood zone along BRGY-02 and BRGY-03, which are outlined.",
    f2: "Map: routes lead from BRGY-02 to EC-01 and from BRGY-03 to EC-02.",
    f3: "Map: the water is going down; all households are checked in at EC-01 and EC-02.",
    checked: "{n} / {total} households checked in",
  },
  war: {
    box: "Istorya: usa nga gab-i han makusog nga uran (nag-i-scroll)",
    s0: "Uran ha kabukiran",
    b0: "Tulo ka oras nga makusog nga uran ha ibabaw. Aada pa ha iya pangpang an salog.",
    s1: "Nagtaas an salog",
    b1: "Naglapad an tubig lapos han pangpang. Aada an BRGY-02 ngan BRGY-03 ha zone han baha ha kilid han salog.",
    s2: "Ginbuksan han mga team an mga center",
    b2: "Ginbuksan han response team an EC-01 ngan EC-02 ngan gin-updan an mga panimalay pakadto didto.",
    s3: "Naka-check in an ngatanan",
    b3: "Nag-check in an mga panimalay gamit an code ha mga center. Waray na naghuhulat ha board.",
    checked: "{n} / {total} nga panimalay an naka-check in",
  },
  fil: {
    box: "Kuwento: isang gabi ng malakas na ulan (nag-i-scroll)",
    s0: "Ulan sa kabundukan",
    b0: "Tatlong oras ng malakas na ulan sa itaas. Nasa pampang pa ang ilog.",
    s1: "Tumataas ang ilog",
    b1: "Kumakalat ang tubig lampas sa pampang. Nasa zone ng baha sa tabi ng ilog ang BRGY-02 at BRGY-03.",
    s2: "Binuksan ng mga team ang mga center",
    b2: "Binuksan ng response team ang EC-01 at EC-02 at sinamahan ang mga sambahayan papunta roon.",
    s3: "Naka-check in ang lahat",
    b3: "Nag-check in ang mga sambahayan gamit ang code sa mga center. Wala nang naghihintay sa board.",
    checked: "{n} / {total} sambahayan ang naka-check in",
  },
};

const FADE = "transition-opacity duration-700 ease-weave motion-reduce:transition-none";

const BARANGAYS = [
  { code: "BRGY-01", points: "30,24 176,24 168,140 30,150", label: [96, 70], risk: false },
  { code: "BRGY-02", points: "30,172 186,160 214,296 30,296", label: [104, 250], risk: true },
  { code: "BRGY-03", points: "286,24 450,24 450,146 300,156", label: [372, 70], risk: true },
  { code: "BRGY-04", points: "336,182 450,176 450,296 384,296", label: [416, 210], risk: false },
] as const;

const CENTRES = [
  { code: "EC-01", x: 96, y: 110, route: "M110 236 C 96 200, 90 160, 96 122", anchor: "start" },
  { code: "EC-02", x: 414, y: 262, route: "M372 112 C 400 150, 420 210, 414 250", anchor: "end" },
] as const;

/**
 * A schematic river map drawn in theme tokens; each step reveals one more layer.
 * The whole map always fits ("meet"); the river runs on past the viewBox so a
 * tall phone panel or a wide desktop one never shows it ending.
 */
function RiverFigure({ step }: { step: number }) {
  const t = useT(strings);
  const fmt = useFormat();
  const show = (visible: boolean, dim = false) => ({ opacity: visible ? (dim ? 0.4 : 1) : 0 });
  return (
    <div className="relative size-full bg-secondary">
      <svg viewBox="0 0 480 320" role="img" aria-label={t(`f${step}` as "f0")} className="size-full">
        {BARANGAYS.map((b) => (
          <polygon
            key={b.code}
            points={b.points}
            strokeWidth={b.risk && step >= 1 ? 3 : 1.5}
            strokeDasharray={b.risk && step >= 1 ? "8 5" : undefined}
            className={cn(b.risk && step >= 1 ? "fill-accent stroke-brand" : "fill-card stroke-border", "transition-[fill,stroke] duration-700")}
          />
        ))}
        {/* Flood extent, then the river itself. */}
        <path
          d="M176 -320 L168 0 C 152 90, 210 130, 178 200 S 230 300, 262 320 L 300 640 L 400 640 L 380 320 C 360 280, 322 220, 322 176 S 340 80, 312 0 L 316 -320 Z"
          className={cn("fill-seq-2", FADE)}
          style={{ opacity: step === 1 || step === 2 ? 0.75 : step === 3 ? 0.3 : 0 }}
        />
        <path
          d="M224 -320 L216 0 C 204 84, 268 120, 256 180 S 304 286, 330 320 L 352 640 L 394 640 L 372 320 C 344 282, 300 200, 292 176 S 248 80, 258 0 L 266 -320 Z"
          className="fill-seq-3"
        />
        {BARANGAYS.map((b) => (
          <text key={b.code} x={b.label[0]} y={b.label[1]} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
            {b.code}
          </text>
        ))}
        {/* Rain over the uplands. */}
        <g className={cn("stroke-seq-4", FADE)} style={show(step <= 1, step === 1)} strokeWidth="2" strokeLinecap="round">
          {Array.from({ length: 14 }, (_, i) => (
            <line key={i} x1={40 + i * 30} y1={6 + (i % 3) * 10} x2={32 + i * 30} y2={20 + (i % 3) * 10} />
          ))}
        </g>
        {/* Evacuation centres and the walking routes to them. */}
        <g className={FADE} style={show(step >= 2)}>
          {CENTRES.map((c) => (
            <g key={c.code}>
              <path d={c.route} fill="none" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" className="stroke-primary" />
              <circle cx={c.x} cy={c.y} r="11" className="fill-primary stroke-card" strokeWidth="3" />
              <path d={`M${c.x - 5} ${c.y + 1} l5 -5 l5 5 v5 h-10 z`} className="fill-primary-foreground" />
              <text x={c.anchor === "start" ? c.x + 17 : c.x - 17} y={c.y + 4} textAnchor={c.anchor} className="fill-foreground text-[12px] font-semibold">
                {c.code}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <p
        aria-hidden={step !== 3}
        className={cn(
          "absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-sm font-semibold text-foreground shadow-raised",
          FADE,
          step === 3 ? "opacity-100" : "opacity-0",
        )}
      >
        <CheckIcon aria-hidden="true" className="size-4 text-primary" />
        {t("checked", { n: fmt.number(128), total: fmt.number(128) })}
      </p>
    </div>
  );
}

export function Example() {
  const t = useT(strings);
  const steps = ([0, 1, 2, 3] as const).map((i) => ({
    id: `step-${i}`,
    title: t(`s${i}`),
    body: <p>{t(`b${i}`)}</p>,
  }));
  return (
    // On a page the chapter scrolls with the window; in a fixed-height box, give it the same `height`.
    <div role="region" aria-label={t("box")} tabIndex={0} className="h-[34rem] overflow-y-auto overscroll-contain rounded-xl border bg-background px-3 sm:px-6">
      <ScrollyChapter steps={steps} height="34rem" headingLevel={2} visual={(step) => <RiverFigure step={step} />} />
    </div>
  );
}
