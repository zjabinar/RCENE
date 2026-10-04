import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import { useKitStrings } from "../i18n.ts";
import { AppMark } from "./app-mark.tsx";
import { WeavePattern } from "./weave-pattern.tsx";
import { Wordmark } from "./wordmark.tsx";

export interface OgCardProps {
  /** The app's title (already translated). */
  title: string;
  tagline?: string;
  /** Shown as a chip, e.g. "07" or "P1". */
  appId?: string;
  className?: string;
}

/**
 * A 1200 x 630 social card (link previews, the poster's app tile): a woven
 * border, the title in the display face, the tagline and the woven app mark.
 * Fixed size on purpose: render it alone on a route and screenshot
 * [data-slot="og-card"] into public/og.png (scripts/brand-assets.mjs --url …).
 */
export function OgCard({ title, tagline, appId, className }: OgCardProps) {
  const t = useT(useKitStrings());
  return (
    <div
      data-slot="og-card"
      className={cn("relative isolate h-[630px] w-[1200px] shrink-0 overflow-hidden bg-background text-foreground", className)}
    >
      <WeavePattern name="banig" opacity={0.85} />
      <div className="absolute inset-[22px] flex overflow-hidden rounded-[28px] bg-card text-card-foreground shadow-overlay">
        <div className="flex min-w-0 flex-1 flex-col justify-between py-14 pr-12 pl-16">
          <div className="flex items-center gap-5">
            <Wordmark variant="compact" className="text-[40px]" />
            {appId && (
              <span className="rounded-full border bg-muted px-4 py-1.5 font-sans text-[22px] leading-none font-semibold tracking-wide text-muted-foreground">
                {t("kit.brand.og.app", { id: appId })}
              </span>
            )}
          </div>
          <div>
            <h2 className="line-clamp-2 font-display text-[76px] leading-[1.04] font-semibold tracking-tight text-balance">{title}</h2>
            {tagline && <p className="mt-6 line-clamp-2 max-w-[30ch] text-[30px] leading-snug text-muted-foreground">{tagline}</p>}
          </div>
          <div className="flex items-center gap-4 font-sans text-[22px] font-semibold tracking-[0.22em] text-brand uppercase">
            <span aria-hidden="true" className="weave-band w-20 rounded-full" />
            {t("kit.brand.place")}
          </div>
        </div>
        <div className="relative w-[380px] shrink-0 overflow-hidden border-l bg-muted">
          <WeavePattern name="diamond" opacity={0.4} />
          <div className="absolute inset-0 grid place-items-center">
            <AppMark size={232} className="shadow-raised rounded-[50px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
