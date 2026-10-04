#!/usr/bin/env node
/**
 * The app's static brand files, drawn from the same geometry as the
 * @rcene/kit/brand components (rcene/kit/brand/geometry.ts), so the favicon,
 * the install icons and the social card match the AppMark in the header.
 *
 *   node scripts/brand-assets.mjs                      everything below, for this app (project.json)
 *   node scripts/brand-assets.mjs --only favicon,icons  just some of: favicon, icons, og
 *   node scripts/brand-assets.mjs --generic            og.png without an app title (what the template ships)
 *   node scripts/brand-assets.mjs --url http://localhost:5100/og
 *                                                      og.png from a running page that renders <OgCard>
 *
 * Writes (into public/, or --out <dir>):
 *   favicon.svg             the woven pin on a cream tile, bold 3 x 3 weave so it reads at 16 px
 *   icons/icon-192.png      install icon, rounded tile on transparent corners
 *   icons/icon-512.png
 *   icons/maskable-512.png  full-bleed cream, the mark inside the 80 % safe zone (Android masks)
 *   og.png                  1200 x 630 link-preview card: title, tagline and id from project.json
 *
 * It runs only when you call it (never on install) and works offline: the
 * fonts come from node_modules (@fontsource-variable), the browser is Edge on
 * Windows or Playwright's Chromium, as in scripts/smoke.mjs. PNGs are
 * re-encoded (opaque images as RGB, adaptive filters, zlib level 9) to stay small.
 * Colours are the habi palette's (the template default); a static file cannot
 * follow the theme. Set RCENE_BRAND_NO_MAIN=1 to import the helpers only.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import zlib from "node:zlib";
import { markSvg, patternSvg } from "../rcene/kit/brand/geometry.ts";

export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The habi palette (rcene/ui/styles/themes.css, light) as the brand drawings' colour slots. */
export const HABI = {
  cream: "#f7f2e8",
  card: "#fffdf8",
  ink: "#2b2118",
  muted: "#efe7da",
  mutedInk: "#5f4f3e",
  border: "#e2d6c2",
  teal: "#0f6b66",
  abaca: "#a0703f",
  violet: "#5b3a8c",
  weaveViolet: "#6d4bb3",
};

/** Mark colours for the static files: teal and abaca strips, violet hem, on cream. */
const MARK_COLORS = { weave1: HABI.teal, weave2: HABI.abaca, weave3: HABI.violet, tile: HABI.cream, edge: HABI.border };

const USAGE = `Usage: node scripts/brand-assets.mjs [--only favicon,icons,og] [--generic] [--url <page>] [--out <dir>]

  --only <list>  which assets to write (default: all)
  --generic      og.png without the app's title: the RCENE card the template ships
  --url <page>   take og.png from a running page that renders <OgCard> (e.g. npm run dev, then /og)
  --out <dir>    output folder (default: public)`;

// ---------------------------------------------------------------------------
// SVG and HTML sources
// ---------------------------------------------------------------------------

/** favicon.svg: the bold "small" mark with a hairline edge so it holds on light tab bars. */
export function faviconSvg() {
  return `${markSvg(MARK_COLORS, { detail: "small", id: "rcene-favicon" })}\n`;
}

/** The install icon: rounded tile, no edge line (the launcher draws its own). */
export function iconSvg() {
  return markSvg({ ...MARK_COLORS, edge: MARK_COLORS.tile }, { id: "rcene-icon" });
}

/** The maskable icon: full-bleed cream, zoomed out so pin and sea sit inside the 80 % circle. */
export function maskableSvg() {
  const bg = `<rect x="-8" y="-8" width="80" height="80" fill="${HABI.cream}"/>`;
  return markSvg({ ...MARK_COLORS, edge: MARK_COLORS.tile }, { id: "rcene-maskable", viewBox: "-4 -4 72 72", before: bg });
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function fontFace(require, family, file, weights) {
  const data = readFileSync(require.resolve(file)).toString("base64");
  return `@font-face{font-family:"${family}";font-weight:${weights};src:url(data:font/woff2;base64,${data}) format("woff2");}`;
}

/**
 * The 1200 x 630 card as a standalone page: the same layout as <OgCard> in
 * habi colours. `fonts` is CSS with @font-face rules (empty in tests).
 */
export function ogHtml({ title, tagline, appId, fonts = "" }) {
  const weave = { weave1: HABI.teal, weave2: HABI.abaca, weave3: HABI.weaveViolet, tile: HABI.card, edge: HABI.border };
  const long = title.length > 30;
  const pin = markSvg(weave, { tile: false, id: "og-pin" }).replace("<svg ", '<svg class="pin" ');
  const mark = markSvg(weave, { id: "og-mark" }).replace("<svg ", '<svg class="mark" ');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:${HABI.cream}}
.card{position:relative;width:1200px;height:630px;overflow:hidden;font-family:"Inter",system-ui,sans-serif;color:${HABI.ink}}
.bg{position:absolute;inset:0;width:100%;height:100%}
.panel{position:absolute;inset:22px;display:flex;overflow:hidden;border-radius:28px;background:${HABI.card};box-shadow:0 10px 30px rgb(0 0 0/.16),0 2px 6px rgb(0 0 0/.08)}
.text{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:56px 48px 56px 64px}
.top{display:flex;align-items:center;gap:20px}
.word{display:inline-flex;align-items:center;gap:12px;font:600 40px/1 "Fraunces",Georgia,serif;letter-spacing:.08em}
.pin{height:48px;width:auto}
.chip{border:1px solid ${HABI.border};background:${HABI.muted};color:${HABI.mutedInk};border-radius:999px;padding:6px 16px;font:600 22px/1 "Inter",sans-serif;letter-spacing:.02em}
h1{font:600 ${long ? 60 : 76}px/1.04 "Fraunces",Georgia,serif;letter-spacing:-.02em;text-wrap:balance;display:-webkit-box;-webkit-line-clamp:${long ? 3 : 2};-webkit-box-orient:vertical;overflow:hidden}
p{margin-top:24px;max-width:30ch;font:400 30px/1.35 "Inter",sans-serif;color:${HABI.mutedInk};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.place{display:flex;align-items:center;gap:16px;font:600 22px/1 "Inter",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:${HABI.violet}}
.band{width:80px;height:8px;border-radius:999px;background:linear-gradient(90deg,${HABI.teal} 50%,${HABI.abaca} 50%) 0 0/24px 50% repeat-x,linear-gradient(90deg,${HABI.abaca} 50%,${HABI.teal} 50%) 0 100%/24px 50% repeat-x,${HABI.weaveViolet}}
.side{position:relative;width:380px;flex-shrink:0;overflow:hidden;border-left:1px solid ${HABI.border};background:${HABI.muted}}
.side .bg{opacity:.3}
.mark{position:absolute;left:74px;top:171px;width:232px;height:232px;border-radius:50px;box-shadow:0 1px 2px rgb(0 0 0/.06),0 4px 14px rgb(0 0 0/.07)}
</style></head><body><div class="card">
<svg class="bg" style="opacity:.85"><defs>${patternSvg("banig", weave, "og-border")}</defs><rect width="100%" height="100%" fill="url(#og-border)"/></svg>
<div class="panel"><div class="text">
<div class="top"><span class="word">${pin}RCENE</span>${appId ? `<span class="chip">App ${escapeHtml(appId)}</span>` : ""}</div>
<div><h1>${escapeHtml(title)}</h1>${tagline ? `<p>${escapeHtml(tagline)}</p>` : ""}</div>
<div class="place"><span class="band"></span>Catbalogan City</div>
</div><div class="side"><svg class="bg"><defs>${patternSvg("diamond", weave, "og-side", 1.5)}</defs><rect width="100%" height="100%" fill="url(#og-side)"/></svg>${mark}</div></div>
</div></body></html>`;
}

/** What og.png says: this app's project.json, or the generic RCENE card for the template. */
export function ogContent(project, generic) {
  if (generic || project.slug === "_template") {
    return { title: "Civic apps that work with Wi-Fi off", tagline: "Weaving innovation and heritage for every barangay." };
  }
  return { title: project.title, tagline: project.tagline, appId: project.id };
}

// ---------------------------------------------------------------------------
// PNG re-encoding (Chromium writes fast, large PNGs)
// ---------------------------------------------------------------------------

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * Encodes { width, height, channels: 3 | 4, rows } (as decodePng returns) as
 * a small PNG: alpha dropped when every pixel is opaque, the best of the five
 * filters per row, zlib level 9.
 */
export function encodePng({ width, height, channels, rows }) {
  let ch = channels;
  let data = rows;
  if (channels === 4 && rows.every((r) => r.every((v, i) => i % 4 !== 3 || v === 255))) {
    ch = 3;
    data = rows.map((r) => {
      const out = Buffer.alloc(width * 3);
      for (let i = 0, j = 0; i < r.length; i += 4, j += 3) {
        out[j] = r[i];
        out[j + 1] = r[i + 1];
        out[j + 2] = r[i + 2];
      }
      return out;
    });
  }
  if (ch !== 3 && ch !== 4) throw new Error(`encodePng: ${ch} channels not supported`);
  const stride = width * ch;
  const raw = Buffer.alloc((stride + 1) * height);
  let prev = Buffer.alloc(stride);
  const candidate = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const line = data[y];
    let best = 0;
    let bestScore = Infinity;
    let bestLine = null;
    for (let f = 0; f < 5; f++) {
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= ch ? line[x - ch] : 0;
        const b = prev[x];
        const c = x >= ch ? prev[x - ch] : 0;
        const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
        const v = (line[x] - pred) & 0xff;
        candidate[x] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        best = f;
        bestLine = Buffer.from(candidate);
      }
    }
    raw[y * (stride + 1)] = best;
    bestLine.copy(raw, y * (stride + 1) + 1);
    prev = line;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, ch === 3 ? 2 : 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        only: { type: "string" },
        generic: { type: "boolean" },
        url: { type: "string" },
        out: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    return 2;
  }
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const only = new Set((values.only ?? "favicon,icons,og").split(",").map((s) => s.trim()).filter(Boolean));
  for (const name of only) {
    if (!["favicon", "icons", "og"].includes(name)) {
      console.error(`Unknown asset "${name}".\n\n${USAGE}`);
      return 2;
    }
  }
  const out = path.resolve(APP_ROOT, values.out ?? "public");
  const project = JSON.parse(readFileSync(path.join(APP_ROOT, "project.json"), "utf8"));
  const require = createRequire(path.join(APP_ROOT, "package.json"));
  const written = [];
  const write = (rel, buf) => {
    const file = path.join(out, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, buf);
    written.push(`${path.relative(APP_ROOT, file)} (${(buf.length / 1024).toFixed(1)} KB)`);
  };

  if (only.has("favicon")) write("favicon.svg", faviconSvg());

  if (only.has("icons") || only.has("og")) {
    process.env.RCENE_SMOKE_NO_MAIN = "1";
    const { decodePng, launchBrowser } = await import("./smoke.mjs");
    const { chromium } = require("playwright");
    const browser = await launchBrowser(chromium);
    try {
      const shoot = async (html, width, height, transparent) => {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const png = await page.screenshot({ type: "png", omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
        await page.close();
        return encodePng(decodePng(png));
      };
      const svgPage = (svg, size) =>
        `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;

      if (only.has("icons")) {
        write("icons/icon-192.png", await shoot(svgPage(iconSvg(), 192), 192, 192, true));
        write("icons/icon-512.png", await shoot(svgPage(iconSvg(), 512), 512, 512, true));
        write("icons/maskable-512.png", await shoot(svgPage(maskableSvg(), 512), 512, 512, false));
      }

      if (only.has("og")) {
        if (values.url) {
          const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
          await page.goto(values.url, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          const card = page.locator('[data-slot="og-card"]').first();
          await card.waitFor({ timeout: 10_000 });
          write("og.png", encodePng(decodePng(await card.screenshot({ type: "png" }))));
          await page.close();
        } else {
          const fonts =
            fontFace(require, "Fraunces", "@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2", "100 900") +
            fontFace(require, "Inter", "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "100 900");
          write("og.png", await shoot(ogHtml({ ...ogContent(project, values.generic), fonts }), 1200, 630, false));
        }
      }
    } finally {
      await browser.close().catch(() => {});
    }
  }

  console.log(`Brand assets for ${project.id} · ${project.title}:\n  ${written.join("\n  ")}`);
  return 0;
}

if (process.env.RCENE_BRAND_NO_MAIN !== "1") {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`brand-assets failed: ${err?.stack ?? err}`);
      process.exit(1);
    },
  );
}
