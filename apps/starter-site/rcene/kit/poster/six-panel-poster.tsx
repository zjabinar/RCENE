import { useId, type CSSProperties, type ReactNode } from "react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";
import { usePosterSheet, type PosterOrientation } from "./poster-page.tsx";

/** The six panels of the PRD §14 poster, in reading order. */
export const POSTER_PANELS = ["problem", "picture", "different", "ai", "data", "impact"] as const;
export type PosterPanelKey = (typeof POSTER_PANELS)[number];

export interface SixPanelPosterProps {
  /** The app's name, in the big title band. */
  title: ReactNode;
  /** One line under the title (what the app does, for whom). */
  subtitle?: ReactNode;
  /** Content of each panel; the headings come from the kit strings. */
  panels: Record<PosterPanelKey, ReactNode>;
  /** Bottom line: team, event, disclosure link, logos. */
  footer?: ReactNode;
  /** Shown at the right of the title band, e.g. <QrToApp url=… />. */
  qr?: ReactNode;
  className?: string;
}

type Place = Pick<CSSProperties, "gridColumn" | "gridRow">;

interface Layout {
  rows: string;
  place: Record<PosterPanelKey | "header" | "footer", Place>;
  /** Title size and band padding; panel body size and padding. */
  title: string;
  band: string;
  body: string;
  panel: string;
}

/**
 * Where each part sits on the 12-column grid, in reading order. Portrait:
 * problem and "what's different" beside a tall picture, then AI | data, then
 * impact. Landscape (thirds): problem / different | picture | AI, then
 * data | impact, with a compact title band. Text panels never clip: their
 * rows grow to fit and the picture gives way.
 */
const LAYOUT: Record<PosterOrientation, Layout> = {
  portrait: {
    rows: "auto minmax(auto, 1fr) minmax(auto, 1fr) minmax(auto, 1.2fr) minmax(auto, 0.7fr) auto",
    place: {
      header: { gridColumn: "1 / -1", gridRow: "1" },
      problem: { gridColumn: "1 / 6", gridRow: "2" },
      picture: { gridColumn: "6 / 13", gridRow: "2 / 4" },
      different: { gridColumn: "1 / 6", gridRow: "3" },
      ai: { gridColumn: "1 / 8", gridRow: "4" },
      data: { gridColumn: "8 / 13", gridRow: "4" },
      impact: { gridColumn: "1 / -1", gridRow: "5" },
      footer: { gridColumn: "1 / -1", gridRow: "6" },
    },
    title: "text-8xl",
    band: "p-[8mm]",
    body: "text-lg",
    panel: "p-[6mm]",
  },
  landscape: {
    rows: "auto minmax(auto, 1fr) minmax(auto, 1fr) minmax(auto, 0.8fr) auto",
    place: {
      header: { gridColumn: "1 / -1", gridRow: "1" },
      problem: { gridColumn: "1 / 5", gridRow: "2" },
      picture: { gridColumn: "5 / 9", gridRow: "2 / 4" },
      different: { gridColumn: "1 / 5", gridRow: "3" },
      ai: { gridColumn: "9 / 13", gridRow: "2 / 4" },
      data: { gridColumn: "1 / 6", gridRow: "4" },
      impact: { gridColumn: "6 / 13", gridRow: "4" },
      footer: { gridColumn: "1 / -1", gridRow: "5" },
    },
    title: "text-6xl",
    band: "px-[8mm] py-[6mm]",
    body: "text-base",
    panel: "p-[5mm]",
  },
};

/**
 * The PRD §14 poster on a PosterPage: a title band, six numbered panels (the
 * problem, the app in one picture, what's different, how AI built it, data,
 * impact) and a footer. Balanced for A3 portrait; landscape and A2 work too.
 *
 *   <PosterPage title="Andam poster"><SixPanelPoster title="Andam" panels={…} /></PosterPage>
 */
export function SixPanelPoster({ title, subtitle, panels, footer, qr, className }: SixPanelPosterProps) {
  const { orientation, inSheet } = usePosterSheet();
  const layout = LAYOUT[orientation];
  return (
    <div
      data-slot="six-panel-poster"
      data-orientation={orientation}
      className={cn("grid h-full min-h-0", className)}
      style={{
        // On a sheet, fill the canvas exactly: size containment keeps the content
        // from growing the canvas row, so the panel rows share the sheet's height.
        contain: inSheet ? "size" : undefined,
        gridColumn: "1 / -1",
        gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
        gridTemplateRows: layout.rows,
        gap: "var(--poster-gap, 6mm)",
      }}
    >
      <header className="flex flex-col gap-[3mm]" style={layout.place.header}>
        <div
          className={cn(
            "flex items-center justify-between gap-[8mm] rounded-xl bg-primary text-primary-foreground",
            layout.band,
          )}
        >
          <div className="min-w-0">
            <h1 className={cn("font-display leading-[0.95] font-bold tracking-tight text-balance", layout.title)}>
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  "mt-[4mm] max-w-[52ch] leading-snug text-pretty",
                  orientation === "portrait" ? "text-2xl" : "text-xl",
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {qr && <div className="shrink-0">{qr}</div>}
        </div>
        <div aria-hidden="true" className="weave-band h-[3mm] rounded-full" />
      </header>

      {POSTER_PANELS.map((key, i) => (
        <PosterPanel key={key} panel={key} number={i + 1} layout={layout}>
          {panels[key]}
        </PosterPanel>
      ))}

      {footer && (
        <footer
          className="flex flex-wrap items-center justify-between gap-x-[6mm] gap-y-[2mm] border-t pt-[3mm] text-base text-muted-foreground"
          style={layout.place.footer}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

function PosterPanel({
  panel,
  number,
  layout,
  children,
}: {
  panel: PosterPanelKey;
  number: number;
  layout: Layout;
  children: ReactNode;
}) {
  const t = useT(useKitStrings());
  const headingId = useId();
  const picture = panel === "picture";
  return (
    <section
      aria-labelledby={headingId}
      data-panel={panel}
      className={cn(
        "flex min-w-0 flex-col gap-[4mm] rounded-xl border bg-card text-card-foreground",
        layout.panel,
        // The picture may shrink (and crop) to leave room for the text panels.
        picture && "min-h-0 overflow-hidden",
      )}
      style={layout.place[panel]}
    >
      <div className="flex items-center gap-[3mm]">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-display text-xl font-semibold text-primary-foreground"
        >
          {number}
        </span>
        <h2 id={headingId} className="font-display text-3xl leading-tight font-semibold tracking-tight">
          {t(`kit.poster.panel.${panel}`)}
        </h2>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 leading-relaxed text-pretty",
          layout.body,
          picture
            ? "grid place-items-center overflow-hidden rounded-lg bg-muted p-[3mm] [&_img]:max-h-full [&_img]:max-w-full [&_img]:object-contain [&>*]:max-h-full"
            : "flex flex-col gap-[3mm]",
        )}
      >
        {children}
      </div>
    </section>
  );
}
