import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { useT } from "@rcene/i18n";
import { downloadText } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface PosterFigureProps {
  title: ReactNode;
  /** One or two sentences: what to see in the figure. */
  caption?: ReactNode;
  /** Where the numbers come from (shown as "Source: …"). */
  source?: string;
  /** File name for a "Download SVG" button (shown once the figure holds an <svg>). */
  downloadSvg?: string;
  className?: string;
  /** An SVG or an SVG chart (Recharts, an SVG map). WebGL maps do not print. */
  children: ReactNode;
}

/** Computed styles copied onto the downloaded SVG, so theme tokens survive outside the page. */
const INLINED = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
] as const;

/**
 * Serialises an on-page <svg> as a standalone file: a deep clone with the
 * computed colours and fonts inlined (CSS variables and currentColor resolved)
 * and an explicit size.
 */
export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sources = [svg, ...svg.querySelectorAll("*")];
  const targets = [clone, ...clone.querySelectorAll("*")];
  sources.forEach((source, i) => {
    const target = targets[i];
    if (!(target instanceof Element)) return;
    const computed = getComputedStyle(source);
    const inline: string[] = [];
    for (const prop of INLINED) {
      const value = computed.getPropertyValue(prop);
      if (value) inline.push(`${prop}:${value}`);
    }
    const own = target.getAttribute("style");
    if (inline.length) target.setAttribute("style", own ? `${inline.join(";")};${own}` : inline.join(";"));
    target.removeAttribute("class");
  });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const box = svg.getBoundingClientRect();
  if (!clone.getAttribute("width") && box.width) clone.setAttribute("width", String(Math.round(box.width)));
  if (!clone.getAttribute("height") && box.height) clone.setAttribute("height", String(Math.round(box.height)));
  return new XMLSerializer().serializeToString(clone);
}

/**
 * A captioned poster figure (title, the SVG or chart, caption, source). With
 * `downloadSvg`, a "Download SVG" button saves the figure's first <svg> for
 * the print shop or another layout tool. The button never prints.
 */
export function PosterFigure({ title, caption, source, downloadSvg, className, children }: PosterFigureProps) {
  const t = useT(useKitStrings());
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasSvg, setHasSvg] = useState(false);

  // Charts often render their <svg> after measuring, so watch for it.
  useEffect(() => {
    const body = bodyRef.current;
    if (!downloadSvg || !body) return;
    const check = () => setHasSvg(body.querySelector("svg") !== null);
    check();
    const observer = new MutationObserver(check);
    observer.observe(body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [downloadSvg]);

  const download = () => {
    const svg = bodyRef.current?.querySelector("svg");
    if (!svg || !downloadSvg) return;
    const filename = downloadSvg.toLowerCase().endsWith(".svg") ? downloadSvg : `${downloadSvg}.svg`;
    downloadText(filename, serializeSvg(svg), "image/svg+xml;charset=utf-8");
  };

  const plainTitle = typeof title === "string" ? title : "";

  return (
    <figure data-slot="poster-figure" className={cn("flex min-w-0 flex-col gap-[0.75em]", className)}>
      <figcaption className="flex flex-col gap-[0.25em]">
        <span className="font-display text-[1.15em] leading-tight font-semibold">{title}</span>
        {caption && <span className="leading-snug text-muted-foreground">{caption}</span>}
      </figcaption>
      <div ref={bodyRef} className="min-h-0 min-w-0 [&>svg]:h-auto [&>svg]:max-w-full">
        {children}
      </div>
      {(source || (downloadSvg && hasSvg)) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {source && <p className="text-[0.85em] text-muted-foreground">{t("kit.posterFigure.source", { source })}</p>}
          {downloadSvg && hasSvg && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ms-auto print:hidden"
              onClick={download}
            >
              <Download aria-hidden="true" />
              {t("kit.posterFigure.download")}
              {plainTitle && <span className="sr-only">: {plainTitle}</span>}
            </Button>
          )}
        </div>
      )}
    </figure>
  );
}
