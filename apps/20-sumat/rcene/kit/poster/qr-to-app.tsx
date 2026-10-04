import { useMemo } from "react";
import { toString as qrToString } from "qrcode";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface QrToAppProps {
  /** The address the code opens (a LAN address on the day, e.g. http://192.168.1.20:5101/). */
  url: string;
  /** Text above the address; default "Scan to open the app". */
  label?: string;
  /** Width of the code: a number in CSS px (default 160, about 42 mm on paper) or any CSS length ("40mm"). */
  size?: number | string;
  className?: string;
}

/**
 * The QR code as an SVG string, black on white with a one-module quiet zone,
 * hidden from assistive technology (the wrapper carries the name). Null if the
 * text is too long for a QR code. The callback form of qrcode's toString runs
 * synchronously, so this works during render.
 */
export function qrSvg(url: string): string | null {
  const result: { svg?: string } = {};
  try {
    qrToString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }, (error, svg) => {
      if (!error) result.svg = svg;
    });
  } catch {
    return null;
  }
  return result.svg ? result.svg.replace("<svg ", '<svg aria-hidden="true" focusable="false" ') : null;
}

/** "https://example.org/app/" → "example.org/app": shorter to read and type off a poster. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** A labelled QR code to the app, with the address as text below it (for the poster and the demo). */
export function QrToApp({ url, label, size = 160, className }: QrToAppProps) {
  const t = useT(useKitStrings());
  const svg = useMemo(() => qrSvg(url), [url]);
  return (
    <figure data-slot="qr-to-app" className={cn("inline-flex w-fit flex-col items-center gap-[0.5em] text-center", className)}>
      {svg && (
        <div
          role="img"
          aria-label={t("kit.qrToApp.alt", { url })}
          className="overflow-hidden rounded-md [&>svg]:block [&>svg]:size-full"
          style={{ width: size, height: size, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      <figcaption className="flex max-w-full flex-col gap-[0.15em]">
        <span className="font-semibold">{label ?? t("kit.qrToApp.label")}</span>
        <span className="font-mono text-[0.85em] break-all opacity-90">{displayUrl(url)}</span>
      </figcaption>
    </figure>
  );
}
