import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { DownloadIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { downloadBlob, downloadText } from "@rcene/ui";
import { Button } from "@rcene/ui/components/button";
import { Skeleton } from "@rcene/ui/components/skeleton";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface QrDisplayProps {
  /** What the code holds: a code (REC-0001), a route of this app, a short text. Keep it short. */
  value: string;
  /** What the code is for; shown under it and read to screen readers. */
  label: string;
  /** Width and height in px (default 192). Shrinks to fit on narrow screens. */
  size?: number;
  /** A file name (".png"/".svg" optional) to show Download PNG and Download SVG buttons. */
  download?: string;
  /** Extra text under the label, e.g. the code in words. */
  hint?: ReactNode;
  className?: string;
}

/*
 * The modules are always black on a white quiet zone (qrcode's defaults), in
 * every palette and in dark mode: phone scanners need dark-on-light. This is
 * the one place the kit does not follow the theme, on purpose.
 */
const QR_OPTIONS = { margin: 4, errorCorrectionLevel: "M" } as const;

function baseName(name: string): string {
  return name.replace(/\.(png|svg)$/i, "");
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ""] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head ?? "")?.[1] ?? "image/png";
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

/**
 * A QR code drawn offline (the `qrcode` package, as SVG) in a figure with its
 * label, and optional PNG / SVG downloads for printing.
 */
export function QrDisplay({ value, label, size = 192, download, hint, className }: QrDisplayProps) {
  const t = useT(useKitStrings());
  const [result, setResult] = useState<{ value: string; svg?: string; failed?: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { ...QR_OPTIONS, type: "svg" })
      .then((svg) => {
        if (alive) setResult({ value, svg });
      })
      .catch(() => {
        if (alive) setResult({ value, failed: true });
      });
    return () => {
      alive = false;
    };
  }, [value]);

  const current = result?.value === value ? result : null;
  const svg = current?.svg;

  const savePng = async () => {
    const url = await QRCode.toDataURL(value, { ...QR_OPTIONS, width: 1024 });
    downloadBlob(`${baseName(download ?? "qr")}.png`, dataUrlToBlob(url));
  };

  return (
    <figure
      data-slot="qr-display"
      className={cn(
        "inline-flex max-w-full flex-col items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-raised",
        className,
      )}
    >
      {svg ? (
        <div
          role="img"
          aria-label={t("kit.qr.alt", { label })}
          data-slot="qr-code"
          className="aspect-square max-w-full overflow-hidden rounded-lg [&>svg]:block [&>svg]:size-full"
          style={{ width: size }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : current?.failed ? (
        <div
          role="alert"
          className="flex aspect-square max-w-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
          style={{ width: size }}
        >
          {t("kit.qr.error")}
        </div>
      ) : (
        <Skeleton aria-busy="true" className="aspect-square max-w-full rounded-lg" style={{ width: size }}>
          <span className="sr-only">{t("kit.qr.loading")}</span>
        </Skeleton>
      )}
      <figcaption className="flex flex-col items-center gap-0.5 text-center" style={{ maxWidth: Math.max(size, 160) }}>
        <span className="text-sm font-semibold text-balance">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </figcaption>
      {download && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!svg} onClick={() => void savePng()}>
            <DownloadIcon aria-hidden="true" />
            {t("kit.qr.downloadPng")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!svg}
            onClick={() => svg && downloadText(`${baseName(download)}.svg`, svg, "image/svg+xml;charset=utf-8")}
          >
            <DownloadIcon aria-hidden="true" />
            {t("kit.qr.downloadSvg")}
          </Button>
        </div>
      )}
    </figure>
  );
}
