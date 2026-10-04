import { useEffect, useRef, useState, type RefObject } from "react";
import { useFormat } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import { CountUp, useReducedMotion } from "@rcene/ui/motion";

export interface StatItem {
  value: number;
  /** What the number counts, already translated ("barangays covered"). */
  label: string;
  /** Formats the number (every frame while counting). Default: locale-grouped, 0 decimals for integers, 1 otherwise. */
  format?: (n: number) => string;
  /** Shown after the number, smaller ("%", "+", " km"). */
  suffix?: string;
}

export interface StatBandProps {
  items: StatItem[];
  /** default = cards on the page; brand = a solid brand-colour band. Default "default". */
  tone?: "default" | "brand";
  className?: string;
}

const COLUMNS = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"] as const;

/** True once the element has been on screen (or at once where IntersectionObserver is missing). */
function useSeen<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/**
 * Big numbers in a band. Each counts up from 0 the first time the band
 * scrolls into view; under reduced motion the final value shows at once.
 * Screen readers always get the final, formatted value.
 */
export function StatBand({ items, tone = "default", className }: StatBandProps) {
  const fmt = useFormat();
  const reduced = useReducedMotion();
  const [ref, seen] = useSeen<HTMLDListElement>();
  const brand = tone === "brand";
  const count = Math.min(Math.max(items.length, 1), 4);

  return (
    <dl
      ref={ref}
      data-slot="stat-band"
      data-tone={tone}
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border shadow-raised",
        COLUMNS[count],
        items.length > 4 && "lg:grid-cols-4",
        brand ? "border-brand bg-[color-mix(in_oklab,var(--brand-foreground)_28%,var(--brand))]" : "bg-border",
        className,
      )}
    >
      {items.map((item, i) => {
        const format = item.format ?? ((n: number) => fmt.number(n, Number.isInteger(item.value) ? 0 : 1));
        const final = `${format(item.value)}${item.suffix ?? ""}`;
        return (
          <div
            key={i}
            data-slot="stat-band-item"
            className={cn(
              "flex flex-col-reverse justify-end gap-2 px-5 py-7 sm:px-8 sm:py-9",
              "[&:last-child:nth-child(odd)]:col-span-2 sm:[&:last-child:nth-child(odd)]:col-span-1",
              brand ? "bg-brand text-brand-foreground" : "bg-card text-card-foreground",
            )}
          >
            <dt className={cn("text-sm leading-snug font-medium sm:text-base", brand ? "text-brand-foreground/85" : "text-muted-foreground")}>
              {item.label}
            </dt>
            <dd className="font-display text-display-2 font-semibold tracking-tight tabular-nums">
              <span className="sr-only">{final}</span>
              <span aria-hidden="true" className="inline-flex items-baseline">
                <CountUp value={reduced || seen ? item.value : 0} format={format} />
                {item.suffix && (
                  <span className={cn("ml-0.5 text-[0.55em] font-medium", brand ? "text-brand-foreground/85" : "text-primary")}>
                    {item.suffix}
                  </span>
                )}
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
