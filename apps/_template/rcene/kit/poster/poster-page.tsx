import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { Info, RectangleHorizontal, RectangleVertical, TriangleAlert } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import { useTheme } from "@rcene/ui/theme";

import { useKitStrings } from "../i18n.ts";
import { PrintButton } from "./print-button.tsx";

export type PosterSize = "A3" | "A2";
export type PosterOrientation = "portrait" | "landscape";
export type PosterPrintTone = "light" | "screen";

/** ISO 216 sheet sizes, [short side, long side] in mm. */
export const POSTER_SIZES_MM: Record<PosterSize, readonly [number, number]> = {
  A3: [297, 420],
  A2: [420, 594],
};

/** CSS pixels per millimetre (96 px per inch). */
const PX_PER_MM = 96 / 25.4;

/** Page margin and grid gap of the A3 design canvas (A2 scales both). */
const CANVAS_MARGIN_MM = 12;
const CANVAS_GAP_MM = 6;

export interface PosterSheetInfo {
  size: PosterSize;
  orientation: PosterOrientation;
  /** Physical sheet size in mm (orientation applied). */
  widthMm: number;
  heightMm: number;
  /** The layout is designed on A3; an A2 sheet shows it at this zoom (420/297). */
  zoom: number;
  /** False outside a PosterPage (the values are then A3 portrait defaults). */
  inSheet: boolean;
}

/** Physical size of a sheet in mm. */
export function posterDimensions(size: PosterSize, orientation: PosterOrientation): { widthMm: number; heightMm: number } {
  const [short, long] = POSTER_SIZES_MM[size];
  return orientation === "portrait" ? { widthMm: short, heightMm: long } : { widthMm: long, heightMm: short };
}

const PosterSheetContext = createContext<PosterSheetInfo | null>(null);

/** The sheet a block is printed on (A3 portrait outside a PosterPage). */
export function usePosterSheet(): PosterSheetInfo {
  const info = use(PosterSheetContext);
  if (info) return info;
  return { size: "A3", orientation: "portrait", ...posterDimensions("A3", "portrait"), zoom: 1, inSheet: false };
}

/**
 * The print stylesheet injected while a PosterPage is mounted: the paper size
 * with no margin, and everything except the sheet hidden (the app header, nav,
 * footer, toasts and the toolbar), with the sheet's ancestors flattened so the
 * sheet starts at the top-left corner of the page.
 */
export function posterPrintCss(widthMm: number, heightMm: number): string {
  return `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: none !important; }
  body *:not(:has([data-poster-sheet])):not([data-poster-sheet]):not([data-poster-sheet] *) { display: none !important; }
  body *:has([data-poster-sheet]) { display: block !important; position: static !important; margin: 0 !important; padding: 0 !important; border: 0 !important; width: auto !important; min-width: 0 !important; max-width: none !important; height: auto !important; min-height: 0 !important; overflow: visible !important; transform: none !important; background: none !important; box-shadow: none !important; }
  [data-poster-sheet] { position: relative !important; transform: none !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; break-inside: avoid; break-after: avoid; }
  [data-poster-sheet], [data-poster-sheet] * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}`;
}

/**
 * True when something on the sheet runs past its edge (and would be cut off in
 * print). Rechecked when the content changes, an image loads or fonts arrive.
 */
function useSheetOverflow(ref: RefObject<HTMLElement | null>, layoutKey: string): boolean {
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setOverflow(el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2),
      );
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, { subtree: true, childList: true, characterData: true });
    el.addEventListener("load", check, true);
    void document.fonts?.ready.then(check);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("load", check, true);
    };
  }, [ref, layoutKey]);
  return overflow;
}

export interface PosterPageProps {
  /** Paper size (the toolbar can switch it); default "A3". */
  size?: PosterSize;
  /** Default "portrait". */
  orientation?: PosterOrientation;
  /**
   * "light" (default): the sheet uses the light variant of the current palette
   * (gabi's light mode is its print variant), whatever the screen shows.
   * "screen": the sheet follows the page's theme.
   */
  printTone?: PosterPrintTone;
  /** Names the sheet, shows in the toolbar and becomes the PDF file name while printing. */
  title?: string;
  /** Show the size / orientation / print toolbar (default true). Never printed. */
  toolbar?: boolean;
  /** Called when the toolbar switches size or orientation. */
  onChange?: (next: { size: PosterSize; orientation: PosterOrientation }) => void;
  className?: string;
  /** Grid items on the sheet's 12-column grid (e.g. one SixPanelPoster). */
  children?: ReactNode;
}

/**
 * A print-ready poster sheet at its exact physical size. On screen it is a
 * fit-to-width preview with a toolbar; in print it is the only thing on the
 * page, edge to edge. The content is laid out on an A3 canvas (12 columns,
 * 12 mm margin, 6 mm gap); A2 prints the same layout 1.41× larger.
 */
export function PosterPage({
  size: sizeProp = "A3",
  orientation: orientationProp = "portrait",
  printTone = "light",
  title,
  toolbar = true,
  onChange,
  className,
  children,
}: PosterPageProps) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const { effective } = useTheme();

  const [size, setSize] = useState(sizeProp);
  const [orientation, setOrientation] = useState(orientationProp);
  const [seen, setSeen] = useState({ sizeProp, orientationProp });
  if (seen.sizeProp !== sizeProp || seen.orientationProp !== orientationProp) {
    setSeen({ sizeProp, orientationProp });
    setSize(sizeProp);
    setOrientation(orientationProp);
  }

  const { widthMm, heightMm } = posterDimensions(size, orientation);
  const design = posterDimensions("A3", orientation);
  const zoom = size === "A3" ? 1 : POSTER_SIZES_MM[size][0] / POSTER_SIZES_MM.A3[0];

  // The @page rule (and the print-only layout) lives in <head> while mounted.
  useLayoutEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-rcene-poster-page", `${widthMm}x${heightMm}`);
    style.textContent = posterPrintCss(widthMm, heightMm);
    document.head.append(style);
    return () => style.remove();
  }, [widthMm, heightMm]);

  // Chrome and Edge name the saved PDF after document.title.
  useEffect(() => {
    if (!title) return;
    let saved: string | null = null;
    const before = () => {
      saved = document.title;
      document.title = title;
    };
    const after = () => {
      if (saved !== null) document.title = saved;
      saved = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [title]);

  // Fit-to-width preview: scale the physical sheet down to the space available.
  const measureRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => setAvailable(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const widthPx = widthMm * PX_PER_MM;
  const heightPx = heightMm * PX_PER_MM;
  const scale = available > 0 ? Math.min(1, available / widthPx) : 1;

  const change = (next: { size: PosterSize; orientation: PosterOrientation }) => {
    setSize(next.size);
    setOrientation(next.orientation);
    onChange?.(next);
  };

  const sheetStyle: CSSProperties = {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: "top left",
    printColorAdjust: "exact",
    WebkitPrintColorAdjust: "exact",
  };
  const canvasStyle = {
    "--poster-margin": `${CANVAS_MARGIN_MM}mm`,
    "--poster-gap": `${CANVAS_GAP_MM}mm`,
    width: `${design.widthMm}mm`,
    height: `${design.heightMm}mm`,
    zoom: zoom === 1 ? undefined : zoom,
    padding: "var(--poster-margin)",
    gap: "var(--poster-gap)",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gridAutoRows: "auto",
  } as CSSProperties;

  const sheetRef = useRef<HTMLElement>(null);
  const overflow = useSheetOverflow(sheetRef, `${size}-${orientation}`);

  const info: PosterSheetInfo = { size, orientation, widthMm, heightMm, zoom, inSheet: true };

  return (
    <div data-slot="poster-page" className={cn("flex w-full min-w-0 flex-col gap-3", className)}>
      {toolbar && (
        <div className="flex flex-col gap-2 print:hidden">
          <div
            role="group"
            aria-label={t("kit.poster.toolbar")}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card p-3 text-card-foreground shadow-raised"
          >
            {title && <p className="min-w-0 flex-1 truncate font-display text-lg font-semibold">{title}</p>}
            <Segmented
              label={t("kit.poster.size")}
              value={size}
              options={[
                { value: "A3", label: "A3" },
                { value: "A2", label: "A2" },
              ]}
              onChange={(next) => change({ size: next, orientation })}
            />
            <Segmented
              label={t("kit.poster.orientation")}
              value={orientation}
              options={[
                { value: "portrait", label: t("kit.poster.portrait"), icon: <RectangleVertical aria-hidden="true" /> },
                { value: "landscape", label: t("kit.poster.landscape"), icon: <RectangleHorizontal aria-hidden="true" /> },
              ]}
              onChange={(next) => change({ size, orientation: next })}
            />
            <span className="text-sm text-muted-foreground tabular-nums">
              {t("kit.poster.scale", { percent: fmt.percent(scale) })}
            </span>
            <PrintButton className={cn(!title && "ms-auto")} />
          </div>
          <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("kit.poster.printHint")}
          </p>
          <div role="status">
            {overflow && (
              <p className="flex items-start gap-2 rounded-lg bg-warning px-3 py-2 text-sm font-medium text-warning-foreground">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t("kit.poster.overflow")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-muted p-3 weave-bg sm:p-6">
        <div ref={measureRef} className="w-full min-w-0">
          <div className="relative mx-auto" style={{ width: widthPx * scale, height: heightPx * scale }}>
            <PosterSheetContext value={info}>
              <article
                ref={sheetRef}
                data-poster-sheet=""
                data-size={size}
                data-orientation={orientation}
                data-palette={printTone === "light" ? effective.palette : undefined}
                data-mode={printTone === "light" ? "light" : undefined}
                aria-label={title ?? t("kit.poster.sheet")}
                className="absolute top-0 left-0 overflow-hidden bg-background font-sans text-foreground shadow-overlay"
                style={sheetStyle}
              >
                <div data-poster-canvas="" className="grid" style={canvasStyle}>
                  {children}
                </div>
              </article>
            </PosterSheetContext>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** A small pressed-button group (A3 | A2, portrait | landscape). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4",
              pressed ? "bg-background text-foreground shadow-raised" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
