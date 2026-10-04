/**
 * Geometry of the RCENE brand drawings: the woven pin mark and the weave
 * pattern tiles. Shared by the React components (app-mark.tsx, wordmark.tsx,
 * weave-pattern.tsx) and by scripts/brand-assets.mjs, which turns the same
 * shapes into favicon.svg, the PWA icons and og.png, so the static files and
 * the components always match.
 *
 * Colours are slots ("weave1", "tile"…), never values: the components fill them
 * with theme tokens (TOKEN_COLORS), the asset script with the habi hex values.
 * Plain TypeScript with no imports, so Node can run it with type stripping.
 */

/** Colour slots of the brand drawings. */
export type BrandSlot = "weave1" | "weave2" | "weave3" | "tile" | "edge";
export type BrandColors = Record<BrandSlot, string>;

/** The slots as theme tokens: what every component uses. */
export const TOKEN_COLORS: BrandColors = {
  weave1: "var(--weave-1)",
  weave2: "var(--weave-2)",
  weave3: "var(--weave-3)",
  tile: "var(--card)",
  edge: "var(--border)",
};

/** One SVG element. `attrs` are camelCase SVG attributes without colours. */
export interface BrandShape {
  tag: "rect" | "path" | "circle";
  attrs: Record<string, string | number>;
  fill?: BrandSlot;
  stroke?: BrandSlot;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function rect(x: number, y: number, width: number, height: number, fill: BrandSlot, extra: Record<string, string | number> = {}): BrandShape {
  return { tag: "rect", attrs: { x: round(x), y: round(y), width: round(width), height: round(height), ...extra }, fill };
}

// ---------------------------------------------------------------------------
// The mark: a map pin woven like a Basey banig, turned 45° so the strips run
// on the diagonal (the mat's diamond look). Drawn in a 64 x 64 box.
// ---------------------------------------------------------------------------

export const MARK_VIEW = 64;

/** "full": 4 x 4 interlace with shading and the sea line; "small": 3 x 3, bolder, for 16-24 px. */
export type MarkDetail = "full" | "small";

interface MarkSpec {
  grid: number;
  /** Side of the pin's square before it is turned (the round head has radius side / 2). */
  side: number;
  /** Y of the head's centre in the 64 box. */
  cy: number;
  gap: number;
  hem: number;
  shade: boolean;
  waves: boolean;
}

const SPECS: Record<MarkDetail, MarkSpec> = {
  full: { grid: 4, side: 36, cy: 26, gap: 2.2, hem: 2, shade: true, waves: true },
  small: { grid: 3, side: 42, cy: 27, gap: 2.4, hem: 3, shade: false, waves: false },
};

export interface MarkParts {
  /** Corner radius of the square tile (an app icon). */
  tileRadius: number;
  /** Transform of the pin group (pin coordinates to the 64 box). */
  pinTransform: string;
  /** The pin with its hole cut out; use as a clip path with clip-rule="evenodd". */
  clip: string;
  /** Backing, strips, over-crossings and shading: drawn inside the clip. */
  weave: BrandShape[];
  /** The hemmed edge and the ring round the hole: drawn over the weave, unclipped. */
  hem: BrandShape[];
  /** The sea under the pin (tile coordinates); empty for "small". */
  waves: BrandShape[];
  /** Tight box round the pin alone, for a mark without a tile: [x, y, width, height]. */
  pinBox: [number, number, number, number];
}

/** Teardrop in pin coordinates: a square with three fully rounded corners and a soft point. */
const TIP = 0.08;

function teardrop(s: number): string {
  const r = s / 2;
  const tip = s * TIP;
  return `M ${r} 0 A ${r} ${r} 0 0 1 ${s} ${r} L ${s} ${round(s - tip)} Q ${s} ${s} ${round(s - tip)} ${s} L ${r} ${s} A ${r} ${r} 0 0 1 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${round(cx - r)} ${cy} a ${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0 a ${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0 Z`;
}

export function markParts(detail: MarkDetail = "full"): MarkParts {
  const { grid, side: s, cy, gap, hem, shade, waves } = SPECS[detail];
  const r = s / 2;
  const pitch = s / grid;
  const w = pitch - gap;
  const holeR = s * (detail === "small" ? 0.2 : 0.18);
  const outline = teardrop(s);

  const weave: BrandShape[] = [{ tag: "path", attrs: { d: outline, opacity: 0.2 }, fill: "weave3" }];
  for (let i = 0; i < grid; i++) weave.push(rect(-2, i * pitch + gap / 2, s + 4, w, "weave1"));
  for (let j = 0; j < grid; j++) weave.push(rect(j * pitch + gap / 2, -2, w, s + 4, "weave2"));
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      if ((i + j) % 2 === 0) weave.push(rect(j * pitch + gap / 2, i * pitch + gap / 2, w, w, "weave1"));
    }
  }
  if (shade) {
    // Where a strip dips under, a thin shadow in the hem colour on each side of the crossing.
    const sh = Math.min(gap, 1.6);
    const o = { opacity: 0.55 };
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        const x = j * pitch + gap / 2;
        const y = i * pitch + gap / 2;
        if ((i + j) % 2 === 0) weave.push(rect(x, y - sh, w, sh, "weave3", o), rect(x, y + w, w, sh, "weave3", o));
        else weave.push(rect(x - sh, y, sh, w, "weave3", o), rect(x + w, y, sh, w, "weave3", o));
      }
    }
  }

  const hemShapes: BrandShape[] = [
    { tag: "path", attrs: { d: outline, fill: "none", strokeWidth: hem, strokeLinejoin: "round" }, stroke: "weave3" },
    { tag: "circle", attrs: { cx: r, cy: r, r: round(holeR), fill: "none", strokeWidth: hem }, stroke: "weave3" },
  ];

  const waveShapes: BrandShape[] = waves
    ? [
        {
          tag: "path",
          attrs: { d: "M 20 56.5 q 3 -2.6 6 0 t 6 0 t 6 0 t 6 0", fill: "none", strokeWidth: 2, strokeLinecap: "round" },
          stroke: "weave1",
        },
      ]
    : [];

  // The soft point peaks a quarter of the rounding in from the corner, on the diagonal.
  const half = hem / 2;
  const tipY = cy + (r - (s * TIP) / 4) * Math.SQRT2;
  const pinBox: [number, number, number, number] = [
    round(32 - r - half),
    round(cy - r - half),
    round(s + hem),
    round(tipY - (cy - r) + hem),
  ];

  return {
    tileRadius: 14,
    pinTransform: `translate(${round(32 - r)} ${round(cy - r)}) rotate(45 ${r} ${r})`,
    clip: `${outline} ${circlePath(r, r, holeR)}`,
    weave,
    hem: hemShapes,
    waves: waveShapes,
    pinBox,
  };
}

// ---------------------------------------------------------------------------
// Weave pattern tiles (for <pattern>), all in the three weave colours.
// ---------------------------------------------------------------------------

export const WEAVE_NAMES = ["banig", "diamond", "stripes", "tikog"] as const;
export type WeaveName = (typeof WEAVE_NAMES)[number];

export interface PatternTile {
  width: number;
  height: number;
  shapes: BrandShape[];
}

/** Plain over-under weave: two weft colours, one warp colour, shaded crossings. */
function banigTile(): PatternTile {
  const pitch = 14;
  const gap = 2;
  const w = pitch - gap;
  const size = pitch * 2;
  const shapes: BrandShape[] = [];
  const weft: BrandSlot[] = ["weave1", "weave3"];
  for (let i = 0; i < 2; i++) shapes.push(rect(0, i * pitch + gap / 2, size, w, weft[i]!));
  for (let j = 0; j < 2; j++) shapes.push(rect(j * pitch + gap / 2, 0, w, size, "weave2"));
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2 === 0) shapes.push(rect(j * pitch + gap / 2, i * pitch + gap / 2, w, w, weft[i]!));
    }
  }
  return { width: size, height: size, shapes };
}

/**
 * The Basey banig motif: stepped concentric diamonds, woven cell by cell. Each
 * tile holds one large diamond; its corners meet the neighbours' to form a
 * smaller diamond in between, as on a mat.
 */
function diamondTile(): PatternTile {
  const n = 12;
  const cell = 4;
  const gap = 0.7;
  const c = (n - 1) / 2;
  const big: Partial<Record<number, BrandSlot>> = { 1: "weave3", 3: "weave1", 5: "weave2" };
  const small: Partial<Record<number, BrandSlot>> = { 1: "weave1", 3: "weave3" };
  const shapes: BrandShape[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const fromCentre = Math.abs(i - c) + Math.abs(j - c);
      const fromCorner = Math.min(i, n - 1 - i) + Math.min(j, n - 1 - j) + 1;
      const slot = fromCentre <= 5 ? big[fromCentre] : small[fromCorner];
      if (slot) shapes.push(rect(j * cell + gap / 2, i * cell + gap / 2, cell - gap, cell - gap, slot));
    }
  }
  return { width: n * cell, height: n * cell, shapes };
}

/** Banded border of a mat: broad and narrow bands with over-under ticks between them. */
function stripesTile(): PatternTile {
  const width = 12;
  const shapes: BrandShape[] = [
    rect(0, 0, width, 12, "weave1"),
    rect(0, 14, 6, 3, "weave2"),
    rect(6, 17, 6, 3, "weave2"),
    rect(0, 22, width, 6, "weave3"),
    rect(0, 30, 6, 3, "weave2"),
    rect(6, 33, 6, 3, "weave2"),
    rect(0, 38, width, 3, "weave1", { opacity: 0.6 }),
  ];
  return { width, height: 44, shapes };
}

/** Tikog twill: the grass strips step one cell per row, so the mat reads as diagonal ridges. */
function tikogTile(): PatternTile {
  const n = 4;
  const cell = 6;
  const gap = 0.8;
  const shapes: BrandShape[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const slot: BrandSlot = (i + j) % n < 2 ? "weave1" : "weave2";
      shapes.push(rect(j * cell + gap / 2, i * cell + gap / 2, cell - gap, cell - gap, slot, slot === "weave2" ? { opacity: 0.75 } : {}));
    }
  }
  // A third-colour pick every fourth row, like the dyed accent strip of a tikog mat.
  shapes.push(rect(0, n * cell - 1.2, n * cell, 1.2, "weave3"));
  return { width: n * cell, height: n * cell, shapes };
}

export function patternTile(name: WeaveName): PatternTile {
  switch (name) {
    case "banig":
      return banigTile();
    case "diamond":
      return diamondTile();
    case "stripes":
      return stripesTile();
    case "tikog":
      return tikogTile();
  }
}

// ---------------------------------------------------------------------------
// Serialisation for scripts (the components render JSX instead).
// ---------------------------------------------------------------------------

const kebab = (key: string) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** One shape as SVG markup with the given colours. */
export function shapeToSvg(shape: BrandShape, colors: BrandColors): string {
  const attrs: Record<string, string | number> = { ...shape.attrs };
  if (shape.fill) attrs.fill = colors[shape.fill];
  if (shape.stroke) attrs.stroke = colors[shape.stroke];
  const text = Object.entries(attrs)
    .map(([k, v]) => `${kebab(k)}="${v}"`)
    .join(" ");
  return `<${shape.tag} ${text}/>`;
}

export interface MarkSvgOptions {
  detail?: MarkDetail;
  /** Draw the square tile (an app icon). Without it: the pin alone, in a tight box. */
  tile?: boolean;
  /** Clip-path id; must be unique in the document the SVG lands in. */
  id?: string;
  /** Extra markup drawn first (e.g. a full-bleed background for a maskable icon). */
  before?: string;
  /** viewBox override, e.g. to zoom out for a maskable icon's safe zone. */
  viewBox?: string;
}

/** The mark as a standalone SVG document string, in the given colours. */
export function markSvg(colors: BrandColors, options: MarkSvgOptions = {}): string {
  const { detail = "full", tile = true, id = "rcene-pin", before = "" } = options;
  const parts = markParts(detail);
  const viewBox = options.viewBox ?? (tile ? `0 0 ${MARK_VIEW} ${MARK_VIEW}` : parts.pinBox.join(" "));
  const body = [
    before,
    `<defs><clipPath id="${id}"><path d="${parts.clip}" clip-rule="evenodd"/></clipPath></defs>`,
    tile
      ? `<rect x="0.75" y="0.75" width="62.5" height="62.5" rx="${parts.tileRadius}" fill="${colors.tile}" stroke="${colors.edge}" stroke-width="1.5"/>`
      : "",
    `<g transform="${parts.pinTransform}">`,
    `<g clip-path="url(#${id})">${parts.weave.map((s) => shapeToSvg(s, colors)).join("")}</g>`,
    parts.hem.map((s) => shapeToSvg(s, colors)).join(""),
    `</g>`,
    tile ? parts.waves.map((s) => shapeToSvg(s, colors)).join("") : "",
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
}

/** A weave pattern tile as a <pattern> element string, in the given colours. */
export function patternSvg(name: WeaveName, colors: BrandColors, id: string, scale = 1): string {
  const tile = patternTile(name);
  const transform = scale === 1 ? "" : ` patternTransform="scale(${scale})"`;
  return `<pattern id="${id}" width="${tile.width}" height="${tile.height}" patternUnits="userSpaceOnUse"${transform}>${tile.shapes
    .map((s) => shapeToSvg(s, colors))
    .join("")}</pattern>`;
}
