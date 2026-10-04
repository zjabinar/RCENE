import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import { useKitStrings } from "../i18n.ts";
import { MarkGraphic } from "./shapes.tsx";

export interface WordmarkProps {
  /** "full": name, woven rule and "Catbalogan City" (default); "compact": mark and name on one line. */
  variant?: "full" | "compact";
  /** Size it with a text class (default text-2xl); colour follows currentColor. */
  className?: string;
}

/** A woven rule, like the weave-band utility: picks of two colours over a third. */
function WovenRule({ className }: { className?: string }) {
  const periods = 5;
  return (
    <svg viewBox="0 0 60 4" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={cn("block", className)}>
      <rect width={60} height={4} fill="var(--weave-3)" />
      {Array.from({ length: periods }, (_, k) => (
        <g key={k}>
          <rect x={k * 12} y={0} width={6} height={2} fill="var(--weave-1)" />
          <rect x={k * 12 + 6} y={2} width={6} height={2} fill="var(--weave-2)" />
        </g>
      ))}
    </svg>
  );
}

/**
 * The RCENE wordmark: the woven pin and the name in the palette's display face
 * (Fraunces; Exo 2 on gabi and showcase surfaces). Not decorative: it is one
 * image named "RCENE" for screen readers.
 */
export function Wordmark({ variant = "full", className }: WordmarkProps) {
  const t = useT(useKitStrings());
  const name = t("kit.brand.name");
  const full = variant === "full";
  return (
    <span
      role="img"
      aria-label={name}
      data-slot="wordmark"
      data-variant={variant}
      className={cn("inline-flex items-center gap-[0.3em] font-display text-2xl leading-none", className)}
    >
      <MarkGraphic
        detail="full"
        tile={false}
        aria-hidden="true"
        focusable="false"
        className={cn("w-auto dark:drop-shadow-[0_0_8px_var(--glow)]", full ? "h-[1.9em]" : "h-[1.2em]")}
      />
      <span aria-hidden="true" className="inline-flex flex-col">
        <span className="font-semibold tracking-[0.08em]">{name}</span>
        {full && (
          <>
            <WovenRule className="mt-[0.16em] h-[0.16em] w-full rounded-[1px]" />
            <span className="mt-[0.32em] font-sans text-[0.3em] font-semibold tracking-[0.24em] whitespace-nowrap text-brand uppercase">
              {t("kit.brand.place")}
            </span>
          </>
        )}
      </span>
    </span>
  );
}
