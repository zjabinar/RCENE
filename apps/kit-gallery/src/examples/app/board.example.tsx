import { MegaphoneIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { Surface } from "@rcene/kit";
import { BoardRotator, BoardShell, CapacityMeter } from "@rcene/kit/app";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "BoardShell · BoardRotator",
  summary: {
    en: "A public screen readable from across the hall: huge type, high contrast (malinaw), a live clock, a polite status line and pages that rotate with Pause / Play.",
    war: "Publiko nga screen nga mababasa tikang ha luyo han hall: dagku nga letra, hayag nga kalainan (malinaw), buhi nga orasan, status nga linya ngan mga pahina nga nagtatalib-ong upod an Pundoha / Padayona.",
    fil: "Pampublikong screen na nababasa mula sa kabilang dulo ng bulwagan: malalaking titik, mataas na contrast (malinaw), live na orasan, status na linya at mga pahinang umiikot na may I-pause / Ituloy.",
  },
  blocks: ["BoardShell", "BoardRotator"],
  order: 110,
  bleed: true,
  frameHeight: 760,
};

const strings = {
  en: {
    title: "Now serving",
    subtitle: "BRGY-05 hall · Windows 1–3",
    nowServing: "Q-014",
    toWindow: "Window 2",
    window: "Window {n}",
    next: "Next: {code}",
    centres: "Evacuation centres",
    court: "EC-01 · Covered court",
    school: "EC-03 · Elementary school",
    notice: "Notice",
    noticeText: "Water refill station open at the covered court, 7 AM to 5 PM.",
    footer: "Sample data · Page changes every 12 s when playing",
    phone: "Your number on your phone: scan the QR at the door",
  },
  war: {
    title: "Ginsisilbihan yana",
    subtitle: "Hall han BRGY-05 · Bintana 1–3",
    toWindow: "Bintana 2",
    window: "Bintana {n}",
    next: "Sunod: {code}",
    centres: "Mga evacuation center",
    court: "EC-01 · Covered court",
    school: "EC-03 · Elementarya",
    notice: "Pahibaro",
    noticeText: "Bukas an refill station han tubig ha covered court, 7 AM tubtob 5 PM.",
    footer: "Sample nga datos · Nagbabag-o an pahina kada 12 s kun nagpi-play",
    phone: "An imo numero ha imo telepono: i-scan an QR ha pultahan",
  },
  fil: {
    title: "Pinaglilingkuran ngayon",
    subtitle: "Bulwagan ng BRGY-05 · Bintana 1–3",
    toWindow: "Bintana 2",
    window: "Bintana {n}",
    next: "Susunod: {code}",
    centres: "Mga evacuation center",
    court: "EC-01 · Covered court",
    school: "EC-03 · Paaralang elementarya",
    notice: "Paalala",
    noticeText: "Bukas ang refill station ng tubig sa covered court, 7 AM hanggang 5 PM.",
    footer: "Sample na datos · Nagpapalit ang pahina bawat 12 s kapag naka-play",
    phone: "Ang numero mo sa telepono mo: i-scan ang QR sa pinto",
  },
};

const WINDOWS = [
  { n: 1, now: "Q-013", next: "Q-016" },
  { n: 2, now: "Q-014", next: "Q-017" },
  { n: 3, now: "Q-015", next: "Q-018" },
];

export function Example() {
  const t = useT(strings);
  const pages = [
    <ul key="windows" className="grid gap-4 sm:grid-cols-3">
      {WINDOWS.map((w) => (
        <li key={w.n} className="flex flex-col gap-1 rounded-xl border-2 p-4">
          <span className="text-lg font-semibold text-muted-foreground">{t("window", { n: w.n })}</span>
          <span className="text-board-2 font-bold">{w.now}</span>
          <span className="text-lg text-muted-foreground">{t("next", { code: w.next })}</span>
        </li>
      ))}
    </ul>,
    <div key="centres" className="flex flex-col gap-5">
      <h2 className="text-board-3 font-bold">{t("centres")}</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <CapacityMeter size="lg" label={t("court")} value={132} max={150} />
        <CapacityMeter size="lg" label={t("school")} value={96} max={240} />
      </div>
    </div>,
    <div key="notice" className="flex items-start gap-4 rounded-xl border-2 p-5">
      <MegaphoneIcon aria-hidden="true" className="mt-1 size-8 shrink-0" />
      <p>
        <span className="block text-lg font-semibold text-muted-foreground">{t("notice")}</span>
        <span className="text-board-3 font-semibold">{t("noticeText")}</span>
      </p>
    </div>,
  ];

  return (
    // In an app: <AppShell width="full" palette="malinaw"> around the board instead of this box.
    <Surface palette="malinaw" className="flex flex-col overflow-hidden sm:h-[40rem]">
      <BoardShell
        title={t("title")}
        subtitle={t("subtitle")}
        status={
          <>
            <span className="rounded-full bg-primary px-4 py-1 text-primary-foreground">{t("nowServing")}</span>
            <span>
              <span aria-hidden="true">→ </span>
              {t("toWindow")}
            </span>
          </>
        }
        footer={
          <>
            <span>{t("footer")}</span>
            <span>{t("phone")}</span>
          </>
        }
      >
        {/* Starts on Pause here (many examples on one page); a kiosk leaves it playing. */}
        <BoardRotator items={pages} intervalMs={12_000} defaultPaused />
      </BoardShell>
    </Surface>
  );
}
