import type { ReactNode } from "react";
import { cn } from "@rcene/ui/lib/utils";

export type IllustrationSpot = "empty" | "search" | "offline" | "error" | "done" | "map";

export interface IllustratedStateProps {
  /** The little picture above the title (default "empty"). Decorative. */
  spot?: IllustrationSpot;
  title: string;
  description?: ReactNode;
  /** Buttons or links under the text. */
  actions?: ReactNode;
  /** "sm" for inside a card or a table, "md" (default) for a whole page section. */
  size?: "sm" | "md";
  className?: string;
}

/** A row of woven squares in the two weave colours (the banig motif). */
function WeaveRow({ x, y, count, size = 6, gap = 4 }: { x: number; y: number; count: number; size?: number; gap?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={x + i * (size + gap)}
          y={y}
          width={size}
          height={size}
          rx={1.2}
          fill={i % 2 === 0 ? "var(--weave-1)" : "var(--weave-2)"}
        />
      ))}
    </g>
  );
}

const STROKE = { stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Spot({ spot }: { spot: IllustrationSpot }) {
  switch (spot) {
    case "empty":
      return (
        <>
          <path d="M44 62h72l-8 30H52z" fill="var(--card)" {...STROKE} />
          <WeaveRow x={55} y={69} count={6} />
          <WeaveRow x={60} y={79} count={5} />
          <path d="M38 62h84" {...STROKE} strokeWidth={3} />
          <path d="M60 32v8M56 36h8M104 26v8M100 30h8" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={92} cy={44} r={2.5} fill="var(--weave-2)" />
        </>
      );
    case "search":
      return (
        <>
          <rect x={34} y={64} width={64} height={28} rx={4} fill="var(--card)" {...STROKE} />
          <WeaveRow x={42} y={71} count={5} />
          <WeaveRow x={47} y={81} count={4} />
          <circle cx={98} cy={48} r={18} fill="var(--background)" {...STROKE} strokeWidth={3} />
          <path d="M90 44a9 9 0 0 1 9-5" stroke="var(--weave-1)" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <path d="M111 61l12 12" stroke="var(--primary)" strokeWidth={6} strokeLinecap="round" />
        </>
      );
    case "offline":
      return (
        <>
          <path
            d="M56 82a16 16 0 0 1-1-32 23 23 0 0 1 44-5 18 18 0 0 1 9 37z"
            fill="var(--card)"
            {...STROKE}
          />
          <path d="M70 66a14 14 0 0 1 20 0M76 72a6 6 0 0 1 8 0" stroke="var(--weave-1)" strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <path d="M50 34l62 58" {...STROKE} strokeWidth={3} />
          <WeaveRow x={66} y={96} count={3} size={5} gap={6} />
        </>
      );
    case "error":
      return (
        <>
          <path d="M46 40h52l14 14v38H46z" fill="var(--card)" {...STROKE} />
          <WeaveRow x={54} y={50} count={4} />
          <WeaveRow x={59} y={60} count={4} />
          <path d="M54 72l8 6 7-7 8 7 7-6 8 6 8-5" stroke="var(--weave-2)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx={110} cy={38} r={13} fill="var(--destructive)" />
          <path d="M110 31v8" stroke="var(--destructive-foreground)" strokeWidth={3} strokeLinecap="round" />
          <circle cx={110} cy={45} r={1.8} fill="var(--destructive-foreground)" />
        </>
      );
    case "done":
      return (
        <>
          <circle cx={80} cy={54} r={26} fill="var(--primary)" />
          <path d="M68 55l8 8 16-17" stroke="var(--primary-foreground)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <WeaveRow x={50} y={90} count={7} size={5} gap={4} />
          <path d="M44 34v7M40.5 37.5h7M118 64v7M114.5 67.5h7" stroke="var(--weave-2)" strokeWidth={2.5} strokeLinecap="round" />
        </>
      );
    case "map":
      return (
        <>
          <path d="M38 46l26-8 32 8 26-8v50l-26 8-32-8-26 8z" fill="var(--card)" {...STROKE} />
          <path d="M64 38v50M96 46v50" stroke="currentColor" strokeWidth={1.5} opacity={0.5} />
          <path d="M46 80c10-4 14-14 26-12s16 10 24-2" stroke="var(--weave-1)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="4 5" fill="none" />
          <path d="M96 26a12 12 0 0 1 12 12c0 9-12 21-12 21S84 47 84 38a12 12 0 0 1 12-12z" fill="var(--primary)" />
          <circle cx={96} cy={38} r={4.5} fill="var(--primary-foreground)" />
        </>
      );
  }
}

/**
 * An empty, no-results, offline, error, done or map-prompt state with a small
 * woven spot illustration drawn in the palette's colours. Calm and centred.
 */
export function IllustratedState({ spot = "empty", title, description, actions, size = "md", className }: IllustratedStateProps) {
  return (
    <div
      role={spot === "error" ? "alert" : "status"}
      data-slot="illustrated-state"
      data-spot={spot}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        size === "md" ? "px-6 py-12" : "px-4 py-8",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 160 120"
        fill="none"
        className={cn(
          "w-auto text-muted-foreground motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in-0 motion-safe:zoom-in-95",
          size === "md" ? "h-28" : "h-20",
        )}
      >
        <circle cx={80} cy={60} r={46} fill="var(--muted)" />
        <ellipse cx={80} cy={108} rx={46} ry={5} fill="currentColor" opacity={0.08} />
        <Spot spot={spot} />
      </svg>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className={cn("font-display font-semibold text-balance", size === "md" ? "text-xl" : "text-lg")}>{title}</p>
        {description && <div className="text-sm text-pretty text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{actions}</div>}
    </div>
  );
}
