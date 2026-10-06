import type { ReactNode } from "react";
import { cn } from "@rcene/ui/lib/utils";

export const SPOT_NAMES = ["empty", "search", "offline", "error", "done", "map", "community", "heritage"] as const;
export type SpotName = (typeof SPOT_NAMES)[number];

export interface SpotIllustrationProps {
  name: SpotName;
  /** Width in px (default 160); the drawing is 4:3. */
  size?: number;
  className?: string;
}

// Token colours only: lines in weave-1, woven fills in weave-2, accents in weave-3, on a muted disc.
const LINE = "var(--weave-1)";
const FILL = "var(--weave-2)";
const ACCENT = "var(--weave-3)";
const DISC = "var(--muted)";
const HOLE = "var(--card)";

/** A small four-point sparkle. */
function Sparkle({ x, y, r = 5, color = ACCENT }: { x: number; y: number; r?: number; color?: string }) {
  return <path d={`M${x} ${y - r}V${y + r}M${x - r} ${y}H${x + r}`} stroke={color} strokeWidth={2.5} />;
}

/** A simple map pin with its hole, tip at (x, y). */
function Pin({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0C0 0-9-9-9-15A9 9 0 0 1 9-15C9-9 0 0 0 0Z" fill={ACCENT} stroke={ACCENT} strokeWidth={2} />
      <circle cx={0} cy={-15} r={3.4} fill={HOLE} stroke="none" />
    </g>
  );
}

const DRAWINGS: Record<SpotName, () => ReactNode> = {
  // An open woven basket (bayong) with nothing in it.
  empty: () => (
    <>
      <path d="M62 56C62 32 98 32 98 56" stroke={LINE} />
      <path d="M50 58H110L103 96Q102 100 98 100H62Q58 100 57 96Z" fill={FILL} fillOpacity={0.18} stroke={LINE} />
      <path d="M53 72H107M56 86H104" stroke={FILL} strokeWidth={2.5} />
      <path d="M68 59V71M92 59V71M80 73V85M68 87V99M92 87V99" stroke={FILL} strokeWidth={2.5} />
      <path d="M46 58H114" stroke={LINE} strokeWidth={3.5} />
      <circle cx={40} cy={42} r={2.5} fill={ACCENT} stroke="none" />
      <circle cx={124} cy={46} r={2} fill={ACCENT} stroke="none" />
      <Sparkle x={120} y={28} />
    </>
  ),
  // A magnifier over a woven mat, finding the diamond motif.
  search: () => (
    <>
      <rect x={34} y={50} width={58} height={46} rx={5} fill={FILL} fillOpacity={0.18} stroke={LINE} />
      <path d="M48 52V94M63 52V94M78 52V94M36 65H90M36 80H90" stroke={FILL} strokeWidth={2} strokeOpacity={0.8} />
      <circle cx={98} cy={52} r={22} fill={HOLE} stroke={LINE} strokeWidth={4} />
      <path d="M98 41L109 52L98 63L87 52Z" stroke={ACCENT} />
      <circle cx={98} cy={52} r={2.5} fill={ACCENT} stroke="none" />
      <path d="M114 68L128 82" stroke={ACCENT} strokeWidth={8} />
      <Sparkle x={42} y={34} r={4} color={FILL} />
    </>
  ),
  // A phone that keeps working with the signal crossed out.
  offline: () => (
    <>
      <rect x={56} y={24} width={46} height={78} rx={8} fill={FILL} fillOpacity={0.14} stroke={LINE} />
      <path d="M72 32H86" stroke={LINE} strokeWidth={2.5} />
      <rect x={63} y={40} width={32} height={46} rx={3} fill={HOLE} stroke={LINE} strokeWidth={2} />
      <path d="M66 78q4-3 8 0t8 0t8 0" stroke={LINE} strokeWidth={2} />
      <Pin x={79} y={72} s={0.8} />
      <path d="M110 40A16 16 0 0 1 132 40M114.5 45.5A9 9 0 0 1 127.5 45.5" stroke={ACCENT} strokeWidth={2.5} />
      <circle cx={121} cy={51} r={2.2} fill={ACCENT} stroke="none" />
      <path d="M108 30L134 56" stroke={LINE} />
    </>
  ),
  // A mat with a torn corner and a loose strip: something came undone.
  error: () => (
    <>
      <path d="M44 40H84L91 49L98 44L104 52V84Q104 88 100 88H44Q40 88 40 84V44Q40 40 44 40Z" fill={FILL} fillOpacity={0.18} stroke={LINE} />
      <path d="M54 42V86M68 42V86M82 46V86M42 56H102M42 72H102" stroke={FILL} strokeWidth={2} strokeOpacity={0.8} />
      <path d="M96 47C104 34 120 42 114 53S120 72 132 66" stroke={FILL} strokeWidth={2.5} />
      <circle cx={120} cy={90} r={11} fill={ACCENT} fillOpacity={0.14} stroke={ACCENT} strokeWidth={2.5} />
      <path d="M120 84V90" stroke={ACCENT} strokeWidth={3} />
      <circle cx={120} cy={95} r={1.7} fill={ACCENT} stroke="none" />
    </>
  ),
  // A woven ring (two colours over-under) with a check.
  done: () => (
    <>
      <circle cx={80} cy={60} r={30} fill={LINE} fillOpacity={0.08} stroke={LINE} strokeWidth={6} />
      <circle cx={80} cy={60} r={30} stroke={FILL} strokeWidth={6} strokeDasharray="11.78 11.78" strokeLinecap="butt" />
      <path d="M66 61L76 71L96 49" stroke={ACCENT} strokeWidth={5} />
      <Sparkle x={124} y={30} />
      <Sparkle x={36} y={36} r={4} color={FILL} />
      <Sparkle x={126} y={88} r={3.5} color={LINE} />
    </>
  ),
  // A folded map of the coast with islands, a route and a pin.
  map: () => (
    <>
      <path d="M34 40L62 32L96 42L126 34V90L96 98L62 88L34 96Z" fill={FILL} fillOpacity={0.14} stroke={LINE} />
      <path d="M62 32V88M96 42V98" stroke={LINE} strokeWidth={2} strokeOpacity={0.55} />
      <path d="M38 76q5-4 10 0t10 0M98 84q5-4 10 0t10 0" stroke={LINE} strokeWidth={2.5} />
      <ellipse cx={74} cy={70} rx={7} ry={4} fill={FILL} fillOpacity={0.55} stroke="none" />
      <ellipse cx={86} cy={78} rx={4} ry={2.5} fill={FILL} fillOpacity={0.55} stroke="none" />
      <path d="M46 58C56 46 70 66 84 56S98 50 104 52" stroke={ACCENT} strokeWidth={2.5} strokeDasharray="3 6" />
      <Pin x={108} y={66} />
    </>
  ),
  // Neighbours together on one mat, under one roof line.
  community: () => (
    <>
      <path d="M56 32L80 18L104 32" stroke={FILL} />
      <circle cx={57} cy={54} r={8} fill={LINE} fillOpacity={0.12} stroke={LINE} />
      <circle cx={103} cy={54} r={8} fill={LINE} fillOpacity={0.12} stroke={LINE} />
      <circle cx={80} cy={45} r={9} fill={ACCENT} fillOpacity={0.14} stroke={ACCENT} />
      <path d="M43 88C43 70 71 70 71 88M89 88C89 70 117 70 117 88" fill={LINE} fillOpacity={0.12} stroke={LINE} />
      <path d="M64 88C64 64 96 64 96 88" fill={ACCENT} fillOpacity={0.14} stroke={ACCENT} />
      <rect x={34} y={90} width={92} height={10} rx={3} fill={FILL} fillOpacity={0.3} stroke={FILL} strokeWidth={2} />
      <path d="M46 95H54M62 95H70M78 95H86M94 95H102M110 95H118" stroke={FILL} strokeWidth={2.5} />
    </>
  ),
  // A bahay na bato: stone arches below, capiz windows above, on a woven band.
  heritage: () => (
    <>
      <path d="M38 44L80 25L122 44Z" fill={FILL} fillOpacity={0.3} stroke={LINE} />
      <rect x={44} y={44} width={72} height={24} fill={FILL} fillOpacity={0.12} stroke={LINE} />
      {[51, 72, 93].map((x) => (
        <g key={x}>
          <rect x={x} y={49} width={16} height={14} rx={1} stroke={ACCENT} strokeWidth={2} />
          <path d={`M${x + 8} 49V63M${x} 56H${x + 16}`} stroke={ACCENT} strokeWidth={1.5} />
        </g>
      ))}
      <rect x={48} y={68} width={64} height={30} fill={LINE} fillOpacity={0.08} stroke={LINE} />
      <path d="M56 98V85A6 6 0 0 1 68 85V98M92 98V85A6 6 0 0 1 104 85V98" stroke={LINE} strokeWidth={2.5} />
      <path d="M74 98V82A6 6 0 0 1 86 82V98" stroke={ACCENT} strokeWidth={2.5} />
      <rect x={30} y={98} width={100} height={6} rx={2} fill={FILL} fillOpacity={0.4} stroke="none" />
    </>
  ),
};

/**
 * Calm line drawings for empty, search, offline, error and done states and for
 * map, community and heritage sections. Decorative: the state's text says what
 * happened; the drawing only sets the tone.
 */
export function SpotIllustration({ name, size = 160, className }: SpotIllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 3) / 4}
      aria-hidden="true"
      focusable="false"
      data-slot="spot-illustration"
      data-spot={name}
      className={cn("block shrink-0", className)}
    >
      <circle cx={80} cy={62} r={50} fill={DISC} />
      <ellipse cx={80} cy={106} rx={46} ry={4} fill={DISC} />
      <g fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {DRAWINGS[name]()}
      </g>
    </svg>
  );
}
