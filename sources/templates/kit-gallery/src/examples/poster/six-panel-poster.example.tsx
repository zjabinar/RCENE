import { useT } from "@rcene/i18n";
import { AiBuiltPanel, PosterFigure, PosterPage, QrToApp, SixPanelPoster } from "@rcene/kit/poster";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "SixPanelPoster",
  summary: {
    en: "The competition poster on an A3 sheet: problem, the app in one picture, what's different, how AI built it, data and impact. Press Print and save as PDF with margins None and background graphics on.",
    war: "An poster han kompetisyon ha A3: problema, an app ha usa nga litrato, ano an iba, paonan-o ginhimo han AI, datos ngan epekto. Pidlita an Print ngan i-save sugad nga PDF.",
    fil: "Ang poster ng kompetisyon sa A3: problema, ang app sa isang larawan, ano ang naiiba, paano binuo ng AI, datos at epekto. Pindutin ang Print at i-save bilang PDF.",
  },
  blocks: ["PosterPage", "SixPanelPoster", "PosterFigure", "AiBuiltPanel", "QrToApp", "PrintButton"],
  order: 10,
  frameHeight: 820,
};

const strings = {
  en: {
    sheet: "Andam poster",
    title: "Andam",
    subtitle: "One warning, three windows: the CDRRMO console, the barangay board and every resident's phone, in step with no server.",
    problem1: "When a typhoon warning goes up, residents ask one question: is my house in a mapped risk zone?",
    problem2: "A map with no data can look exactly like a map with no risk. Andam always says which one it is.",
    pictureTitle: "Mid-warning, 09:00",
    pictureCaption: "The CDRRMO raises a flood warning for BRGY-05; the board and the phones update at once.",
    pictureSource: "Demo screens, synthetic data",
    pictureAlt: "Three windows: the console raises a flood warning for BRGY-05, the barangay board shows it, and a resident's phone shows the flood level High.",
    console: "CDRRMO console",
    board: "Barangay board",
    phone: "Resident",
    raise: "Raise warning",
    warning: "Flood warning",
    boardTime: "BRGY-05 · 09:00",
    inZone: "In a mapped zone",
    levelHigh: "Flood · High",
    different1: "Three truthful answers: in a mapped zone (with its level), not in a mapped zone, outside the data.",
    different2: "Evacuation centers inside the hazard are never recommended.",
    different3: "Live sync across roles in one browser, with no server; Waray first.",
    toolClaude: "Wrote and tested each requirement from the brief",
    toolPlaywright: "Clicked through every screen at 390 and 1280 px",
    step1: "Brief and plan",
    step2: "Domain tests first",
    step3: "One requirement per commit",
    step4: "Human review of every commit (AI-LOG.md)",
    disclosure:
      "Built before today, with AI: data, shared libraries and 20 single-feature apps (Claude Code, parallel sessions). Built today: everything after the pre-event-freeze tag, shown by git diff pre-event-freeze..HEAD.",
    data1: "Barangay boundaries: OCHA/HDX",
    data2: "Flood and landslide risk maps: CDRRMO/CPDCO, used with LGU permission",
    data3: "Facilities: OpenStreetMap contributors",
    data4: "Households: synthetic, coded HH-0001 to HH-0240",
    impact1: "An official evacuation-center registry",
    impact2: "SMS and push alerts",
    impact3: "Every barangay hall on the board",
    footerEvent: "RSCENE 2026 AI Vibe Coding Challenge · Catbalogan City",
    footerTeam: "Team T-07 · built with the RCENE kit",
  },
  war: {
    subtitle: "Usa nga warning, tulo nga bintana: an console han CDRRMO, an board han barangay ngan an telepono han kada residente, dungan bisan waray server.",
    problem1: "Kon may warning han bagyo, usa la an pakiana han mga residente: aada ba an akon balay ha mapa nga risk zone?",
    pictureTitle: "Samtang may warning, 09:00",
    console: "Console han CDRRMO",
    board: "Board han barangay",
    phone: "Residente",
    raise: "Ipataas an warning",
    warning: "Warning han baha",
    inZone: "Aada ha mapa nga zone",
    levelHigh: "Baha · Hitaas",
    impact2: "SMS ngan push nga alerto",
    impact3: "An board ha kada barangay hall",
  },
  fil: {
    subtitle: "Isang babala, tatlong bintana: ang console ng CDRRMO, ang board ng barangay at ang telepono ng bawat residente, sabay-sabay kahit walang server.",
    problem1: "Kapag may babala ng bagyo, iisa ang tanong ng mga residente: nasa mapang risk zone ba ang bahay ko?",
    pictureTitle: "Habang may babala, 09:00",
    console: "Console ng CDRRMO",
    board: "Board ng barangay",
    phone: "Residente",
    raise: "Itaas ang babala",
    warning: "Babala ng baha",
    inZone: "Nasa mapang zone",
    levelHigh: "Baha · Mataas",
    impact2: "SMS at push na alerto",
    impact3: "Ang board sa bawat barangay hall",
  },
};

/** "The app in one picture": the three windows mid-warning, drawn in theme tokens so it prints. */
function ThreeWindows() {
  const t = useT(strings);
  const label = "fill-muted-foreground text-[11px]";
  return (
    <svg viewBox="0 0 480 300" role="img" aria-label={t("pictureAlt")} className="h-auto w-full">
      {/* sync lines between the windows */}
      <path d="M244 80 H256 M200 192 C200 230 260 236 330 230" className="fill-none stroke-primary" strokeWidth="2" strokeDasharray="4 4" />

      {/* console */}
      <rect x="8" y="24" width="236" height="168" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />
      <path d="M8 34a10 10 0 0 1 10-10h216a10 10 0 0 1 10 10v12H8z" className="fill-muted" />
      <text x="20" y="40" className={label}>{t("console")}</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="20" y={60 + i * 26} width="120" height="10" rx="5" className="fill-muted" />
          <text x="150" y={69 + i * 26} className="fill-foreground text-[11px] font-semibold">{`BRGY-0${i + 4}`}</text>
        </g>
      ))}
      <rect x="20" y="146" width="212" height="32" rx="8" className="fill-primary" />
      <text x="126" y="166" textAnchor="middle" className="fill-primary-foreground text-[13px] font-semibold">
        {t("raise")} · BRGY-05
      </text>

      {/* board */}
      <rect x="256" y="24" width="216" height="120" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />
      <path d="M256 34a10 10 0 0 1 10-10h196a10 10 0 0 1 10 10v12H256z" className="fill-muted" />
      <text x="268" y="40" className={label}>{t("board")}</text>
      <text x="268" y="88" className="fill-foreground font-display text-[22px] font-bold">{t("warning")}</text>
      <text x="268" y="114" className="fill-muted-foreground text-[13px]">{t("boardTime")}</text>
      <rect x="268" y="124" width="192" height="6" rx="3" className="fill-primary" />

      {/* phone */}
      <rect x="330" y="156" width="104" height="138" rx="16" className="fill-card stroke-border" strokeWidth="1.5" />
      <rect x="366" y="164" width="32" height="5" rx="2.5" className="fill-muted" />
      <text x="342" y="188" className={label}>{t("phone")}</text>
      <text x="342" y="208" className="fill-foreground text-[14px] font-semibold">BRGY-05</text>
      <text x="342" y="226" className="fill-muted-foreground text-[10px]">{t("inZone")}</text>
      <rect x="342" y="236" width="80" height="24" rx="6" className="fill-level-high" />
      <path d="M352 254 l5 -9 l5 9 z" className="fill-level-high-foreground" />
      <text x="366" y="252" className="fill-level-high-foreground text-[10px] font-semibold">{t("levelHigh")}</text>
      <rect x="342" y="268" width="80" height="8" rx="4" className="fill-muted" />
    </svg>
  );
}

export function Example() {
  const t = useT(strings);
  return (
    // fit="contain" keeps the whole sheet in view inside a box of fixed height.
    <PosterPage title={t("sheet")} fit="contain" className="h-[48rem]">
      <SixPanelPoster
        title={t("title")}
        subtitle={t("subtitle")}
        qr={<QrToApp url="http://192.168.1.20:5101/" size="32mm" />}
        footer={
          <>
            <span>{t("footerEvent")}</span>
            <span>{t("footerTeam")}</span>
          </>
        }
        panels={{
          problem: (
            <>
              <p>{t("problem1")}</p>
              <p>{t("problem2")}</p>
            </>
          ),
          picture: (
            <PosterFigure title={t("pictureTitle")} caption={t("pictureCaption")} source={t("pictureSource")}>
              <ThreeWindows />
            </PosterFigure>
          ),
          different: (
            <ul className="flex list-disc flex-col gap-2 ps-6">
              <li>{t("different1")}</li>
              <li>{t("different2")}</li>
              <li>{t("different3")}</li>
            </ul>
          ),
          ai: (
            <AiBuiltPanel
              tools={[
                { name: "Claude Code", role: t("toolClaude") },
                { name: "Playwright", role: t("toolPlaywright") },
              ]}
              steps={[t("step1"), t("step2"), t("step3"), t("step4")]}
              disclosure={t("disclosure")}
            />
          ),
          data: (
            <ul className="flex list-disc flex-col gap-1.5 ps-6">
              <li>{t("data1")}</li>
              <li>{t("data2")}</li>
              <li>{t("data3")}</li>
              <li>{t("data4")}</li>
            </ul>
          ),
          impact: (
            <ul className="flex list-disc flex-col gap-1.5 ps-6">
              <li>{t("impact1")}</li>
              <li>{t("impact2")}</li>
              <li>{t("impact3")}</li>
            </ul>
          ),
        }}
      />
    </PosterPage>
  );
}
