#!/usr/bin/env node
/**
 * Smoke test for this app: the definition-of-done gate.
 *
 *   npm run smoke                                   (or: node scripts/smoke.mjs)
 *   node scripts/smoke.mjs --route / --route /map   (default: project.json "smokeRoutes")
 *   node scripts/smoke.mjs --no-build --keep-open
 *
 * The app is the folder above scripts/; its project.json gives the port and routes.
 *   1. build: tsc -b, then vite build                (skipped with --no-build)
 *   2. vite preview on the preview port               (project.json port + 1000)
 *   3. headless browser with every non-localhost request aborted (offline check;
 *      OSM tiles of the opt-in online basemap are only a warning)
 *   4. each route at 390x844 and 1280x800: no console or page errors, the map
 *      canvas (if any) is not blank, no serious/critical axe violations, and a
 *      screenshot in docs/screenshots/<route>-<width>.png
 *   5. PASS/FAIL summary; exit code 1 on any failure
 * The preview server is always stopped (with --keep-open: when you press Ctrl+C).
 *
 * Package-manager agnostic: TypeScript, Vite, Playwright and axe-core are resolved
 * from this app's own node_modules (npm or pnpm layout) and run with this Node.
 * Works on Windows (Edge, falling back to Playwright's Chromium) and Linux (Chromium).
 * Set RCENE_SMOKE_NO_MAIN=1 to import the helpers without running a smoke test.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIN = process.platform === "win32";
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];
const DEFAULT_ROUTES = ["/", "/sources"];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
/** OSM raster tiles load only when the user switches on the online basemap. */
const OSM_TILE_HOST = /(^|\.)tile\.openstreetmap\.org$|(^|\.)tile\.osm\.org$/i;
const BROWSER_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const MAP_WAIT_MS = 10_000;

const USAGE = `Usage: node scripts/smoke.mjs [--route /path ...] [--no-build] [--keep-open]

  --route <p>    route to visit (default: project.json "smokeRoutes", else / and /sources); repeatable
  --no-build     reuse the existing dist/ instead of running tsc -b and vite build
  --keep-open    leave the preview server running until Ctrl+C`;

// ---------------------------------------------------------------------------
// Arguments, project.json and local binaries
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const opts = { routes: [], build: true, keepOpen: false, help: false, app: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined || (inline === undefined && v.startsWith("--"))) throw new Error(`${flag} needs a value`);
      return v;
    };
    switch (flag) {
      case "--route":
        opts.routes.push(normalizeRoute(value()));
        break;
      case "--app": // accepted for the old monorepo-wide call, but it must name this app
        opts.app = value();
        break;
      case "--no-build":
        opts.build = false;
        break;
      case "--keep-open":
        opts.keepOpen = true;
        break;
      case "-h":
      case "--help":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function normalizeRoute(route) {
  const r = route.trim();
  return r.startsWith("/") ? r : `/${r}`;
}

/** "/" -> "home", "/sources" -> "sources", "/a/b?x=1" -> "a-b-x-1". */
export function routeName(route) {
  const name = route.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return name || "home";
}

/** This app's metadata from project.json, with the preview port and default routes filled in. */
export function readProject(root = APP_ROOT) {
  const file = path.join(root, "project.json");
  if (!existsSync(file)) throw new Error(`Missing ${file}: every app folder needs its project.json`);
  const project = JSON.parse(readFileSync(file, "utf8"));
  if (!Number.isInteger(project.port)) throw new Error(`project.json has no numeric "port"`);
  const routes = Array.isArray(project.smokeRoutes) && project.smokeRoutes.length ? project.smokeRoutes.map(normalizeRoute) : DEFAULT_ROUTES;
  let pkg = "-";
  try {
    pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).name ?? "-";
  } catch {
    // keep "-"
  }
  return { ...project, slug: project.slug ?? path.basename(root), pkg, previewPort: project.port + 1000, routes };
}

/** True when `--app x` names this app (slug, id, "template" for _template, or "."). */
export function isThisApp(arg, project) {
  return [project.slug, project.id, ".", project.slug === "_template" ? "template" : null].includes(arg) || project.slug.startsWith(`${arg}-`);
}

/** Directory of an installed package, found the way Node would from `from` (npm and pnpm layouts). */
export function packageDir(name, from = APP_ROOT) {
  const require = createRequire(path.join(from, "package.json"));
  for (const dir of require.resolve.paths(name) ?? []) {
    const candidate = path.join(dir, ...name.split("/"));
    // Real path: under pnpm a package sees its own dependencies only beside its real location.
    if (existsSync(path.join(candidate, "package.json"))) return realpathSync(candidate);
  }
  return null;
}

/** Absolute path of a package's bin script (from its package.json "bin"). */
export function binScript(pkgName, binName = pkgName, from = APP_ROOT) {
  const dir = packageDir(pkgName, from);
  if (!dir) throw new Error(`${pkgName} is not installed in ${from} (run npm ci, or pnpm install in a monorepo)`);
  const { bin } = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  const rel = typeof bin === "string" ? bin : bin?.[binName];
  if (!rel) throw new Error(`${pkgName} has no "${binName}" bin`);
  return path.join(dir, rel);
}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

function runNode(script, args, label) {
  console.log(`\n> ${label}`);
  const result = spawnSync(process.execPath, [script, ...args], { cwd: APP_ROOT, stdio: "inherit", windowsHide: true });
  if (result.error) console.error(`  could not run ${label}: ${result.error.message}`);
  return result.status === 0;
}

function build() {
  return runNode(binScript("typescript", "tsc"), ["-b"], "tsc -b") && runNode(binScript("vite"), ["build"], "vite build");
}

function startPreview(app) {
  const args = ["preview", "--port", String(app.previewPort), "--strictPort", "--host", "127.0.0.1"];
  console.log(`> vite ${args.join(" ")}`);
  const child = spawn(process.execPath, [binScript("vite"), ...args], {
    cwd: APP_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: !WIN, // own process group on POSIX so the whole tree can be killed
  });
  const output = [];
  const keep = (chunk) => {
    output.push(...String(chunk).split(/\r?\n/).filter(Boolean));
    if (output.length > 60) output.splice(0, output.length - 60);
  };
  child.stdout.on("data", keep);
  child.stderr.on("data", keep);
  child.on("error", (err) => keep(`spawn error: ${err.message}`));
  return { child, output };
}

export async function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  if (WIN) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
  const timer = setTimeout(() => {
    try {
      if (WIN) child.kill();
      else process.kill(-child.pid, "SIGKILL");
    } catch {
      // already gone
    }
  }, 5000);
  await exited;
  clearTimeout(timer);
}

function httpAnswers(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
  });
}

async function waitForPort(port, child, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`vite preview exited with code ${child.exitCode}`);
    if (await httpAnswers(port)) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`nothing answered on port ${port} within ${timeoutMs / 1000} s`);
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

export async function launchBrowser(chromium) {
  const options = { headless: true, args: BROWSER_ARGS };
  if (WIN) {
    try {
      return await chromium.launch({ ...options, channel: "msedge" });
    } catch (err) {
      console.warn(`Could not launch Microsoft Edge (${err.message.split("\n")[0]}); trying Playwright's Chromium.`);
    }
  } else if (existsSync("/opt/pw-browsers/chromium")) {
    options.executablePath = "/opt/pw-browsers/chromium";
  }
  return chromium.launch(options);
}

export function isLocalUrl(url) {
  try {
    const u = new URL(url);
    if (["data:", "blob:", "about:", "file:"].includes(u.protocol)) return true;
    return LOCAL_HOSTS.has(u.hostname);
  } catch {
    return true;
  }
}

export function isOsmTile(url) {
  try {
    return OSM_TILE_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** A browser context that aborts every request leaving the machine and records it. */
export async function offlineContext(browser, viewport, aborted) {
  // Service workers are blocked: Playwright cannot route their requests, so the offline check would miss them.
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, serviceWorkers: "block" });
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (isLocalUrl(url)) return route.continue();
    aborted.push(url);
    return route.abort("internetdisconnected");
  });
  return context;
}

// ---------------------------------------------------------------------------
// Blank-canvas detection: decode the element screenshot (PNG) and check
// whether every pixel has the same colour.
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** Decodes an 8-bit, non-interlaced PNG to { width, height, channels, rows: Buffer[] }. */
export function decodePng(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG");
  let offset = 8;
  let ihdr = null;
  const idat = [];
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("latin1", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  if (!ihdr) throw new Error("PNG without IHDR");
  const channels = CHANNELS[ihdr.colorType];
  if (ihdr.bitDepth !== 8 || !channels || ihdr.interlace !== 0) {
    throw new Error(`unsupported PNG (bit depth ${ihdr.bitDepth}, colour type ${ihdr.colorType}, interlace ${ihdr.interlace})`);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.width * channels;
  const rows = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < ihdr.height; y++) {
    const start = y * (stride + 1);
    const filter = raw[start];
    const line = Buffer.from(raw.subarray(start + 1, start + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = (line[x] + add) & 0xff;
    }
    rows.push(line);
    prev = line;
  }
  return { width: ihdr.width, height: ihdr.height, channels, rows };
}

/** True when every pixel of the PNG has exactly the same colour (a blank map). */
export function isSingleColorPng(buf) {
  const { channels, rows } = decodePng(buf);
  if (rows.length === 0) return true;
  const first = rows[0].subarray(0, channels);
  for (const row of rows) {
    for (let x = 0; x < row.length; x += channels) {
      for (let c = 0; c < channels; c++) if (row[x + c] !== first[c]) return false;
    }
  }
  return true;
}

async function checkMapCanvas(page) {
  const canvas = page.locator("canvas.maplibregl-canvas").first();
  if ((await canvas.count()) === 0) return { state: "none" };
  const deadline = Date.now() + MAP_WAIT_MS;
  let state = "blank";
  let detail = "";
  for (;;) {
    try {
      if (await canvas.isVisible()) {
        const png = await canvas.screenshot({ timeout: 5000 });
        if (!isSingleColorPng(png)) return { state: "ok" };
        state = "blank";
      } else state = "hidden";
    } catch (err) {
      state = "blank";
      detail = err.message.split("\n")[0];
    }
    if (Date.now() >= deadline) return { state, detail };
    await page.waitForTimeout(500);
  }
}

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

export function axePath(from = APP_ROOT) {
  return createRequire(path.join(from, "package.json")).resolve("axe-core/axe.min.js");
}

export async function axeViolations(page, file = axePath()) {
  await page.addScriptTag({ path: file });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, { resultTypes: ["violations"] });
    return result.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        count: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      }));
  });
}

// ---------------------------------------------------------------------------
// One route at one viewport
// ---------------------------------------------------------------------------

export async function checkPage(browser, { baseUrl, route, viewport, screenshotPath, axeFile }) {
  const aborted = [];
  const context = await offlineContext(browser, viewport, aborted);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const warnings = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ text: msg.text(), url: msg.location()?.url ?? "" });
  });
  page.on("pageerror", (err) => pageErrors.push(String(err?.message ?? err)));

  const result = { route, viewport, failures: [], warnings, aborted: [], osmTiles: [], map: "none", axe: [], screenshot: null };
  try {
    try {
      const response = await page.goto(new URL(route, baseUrl).href, { waitUntil: "load", timeout: 30_000 });
      if (response && response.status() >= 400) result.failures.push(`HTTP ${response.status()} for ${route}`);
    } catch (err) {
      result.failures.push(`navigation failed: ${err.message.split("\n")[0]}`);
    }
    try {
      await page.waitForLoadState("networkidle", { timeout: 15_000 });
    } catch {
      warnings.push("network did not go idle within 15 s");
    }

    const map = await checkMapCanvas(page);
    result.map = map.state;
    if (map.state === "blank") result.failures.push(`map canvas still blank after ${MAP_WAIT_MS / 1000} s${map.detail ? ` (${map.detail})` : ""}`);
    if (map.state === "hidden") warnings.push("map canvas present but not visible at this size");

    if (screenshotPath) {
      mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;
    }

    try {
      result.axe = await axeViolations(page, axeFile);
      if (result.axe.length) result.failures.push(`${result.axe.length} serious/critical axe violation(s)`);
    } catch (err) {
      result.failures.push(`axe could not run: ${err.message.split("\n")[0]}`);
    }
  } finally {
    await context.close().catch(() => {});
  }

  // A blocked request shows up as a console error too; it is reported once, below.
  const abortedSet = new Set(aborted);
  const realConsole = consoleErrors.filter((e) => !abortedSet.has(e.url) && !aborted.some((u) => e.text.includes(u)));
  result.aborted = aborted.filter((u) => !isOsmTile(u));
  result.osmTiles = aborted.filter(isOsmTile);
  if (realConsole.length) result.failures.push(`${realConsole.length} console error(s)`);
  if (pageErrors.length) result.failures.push(`${pageErrors.length} uncaught page error(s)`);
  if (result.aborted.length) result.failures.push(`${result.aborted.length} request(s) left the machine (the app must work offline)`);
  if (result.osmTiles.length) warnings.push(`${result.osmTiles.length} OSM tile request(s) blocked (allowed: online basemap only)`);
  result.consoleErrors = realConsole.map((e) => e.text);
  result.pageErrors = pageErrors;
  return result;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/** First line of each message, deduplicated, with a repeat count. */
function distinctLines(messages) {
  const counts = new Map();
  for (const m of messages) {
    const line = String(m).split("\n")[0].trim().slice(0, 300);
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return [...counts].map(([line, n]) => (n > 1 ? `${line} (x${n})` : line));
}

function printPage(r) {
  const size = `${r.viewport.width}x${r.viewport.height}`;
  const status = r.failures.length ? "FAIL" : "PASS";
  const shot = r.screenshot ? path.relative(APP_ROOT, r.screenshot).split(path.sep).join("/") : "-";
  console.log(`  ${status}  ${r.route.padEnd(16)} ${size.padEnd(9)} map:${r.map.padEnd(6)} axe:${String(r.axe.length).padEnd(3)} ${shot}`);
  for (const f of r.failures) console.log(`        x ${f}`);
  for (const w of r.warnings) console.log(`        ! ${w}`);
  for (const e of distinctLines(r.consoleErrors ?? [])) console.log(`        console: ${e}`);
  for (const e of distinctLines(r.pageErrors ?? [])) console.log(`        page error: ${e}`);
  for (const u of r.aborted) console.log(`        blocked: ${u}`);
  for (const v of r.axe) {
    console.log(`        axe ${v.impact} ${v.id}: ${v.help} (${v.count} node(s)) ${v.helpUrl}`);
    for (const t of v.targets) console.log(`            ${t}`);
  }
}

/** Prints the summary and returns true when everything passed. */
function printSummary(report) {
  const { app } = report;
  const failed = report.failures.length > 0 || report.pages.some((p) => p.failures.length);
  console.log("\n================ smoke summary ================");
  console.log(`\n${failed ? "FAIL" : "PASS"}  ${app.slug} (${app.pkg})  preview http://127.0.0.1:${app.previewPort}`);
  for (const f of report.failures) console.log(`  x ${f}`);
  for (const line of report.serverOutput ?? []) console.log(`    | ${line}`);
  for (const p of report.pages) printPage(p);
  console.log(`\n${failed ? "SMOKE FAIL" : "SMOKE PASS"}: ${app.slug}, ${report.pages.length} page check(s)`);
  return !failed;
}

// ---------------------------------------------------------------------------

async function main() {
  let opts;
  let app;
  try {
    opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
      console.log(USAGE);
      return 0;
    }
    app = readProject();
    if (opts.app !== null && !isThisApp(opts.app, app)) {
      throw new Error(`This copy of smoke.mjs checks only ${app.slug}; run the copy in the other app's folder (cd into it, then npm run smoke).`);
    }
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    return 2;
  }
  const routes = opts.routes.length ? opts.routes : app.routes;

  let server = null;
  let interrupted = false;
  // Once the summary is printed, Ctrl+C (with --keep-open) exits with the smoke result,
  // not 130, so callers can still tell PASS from FAIL.
  let resultCode = 130;
  process.once("SIGINT", () => {
    interrupted = true;
    (server ? killTree(server.child) : Promise.resolve()).finally(() => process.exit(resultCode));
  });

  const report = { app, failures: [], pages: [] };
  let browser;
  try {
    console.log(`\n=== ${app.slug} (${app.pkg}) in ${APP_ROOT} ===`);
    const { chromium } = createRequire(path.join(APP_ROOT, "package.json"))("playwright");
    const axeFile = axePath();
    if (opts.build && !build()) {
      report.failures.push("build failed (see output above)");
    } else if (await httpAnswers(app.previewPort)) {
      report.failures.push(`port ${app.previewPort} is already in use: stop the other preview (or a previous --keep-open run) first`);
    } else {
      server = startPreview(app);
      try {
        await waitForPort(app.previewPort, server.child);
      } catch (err) {
        report.failures.push(`vite preview did not start: ${err.message}`);
        report.serverOutput = server.output.slice(-20);
        await killTree(server.child);
        server = null;
      }
      if (server) {
        browser = await launchBrowser(chromium);
        const baseUrl = `http://127.0.0.1:${app.previewPort}`;
        for (const route of routes) {
          for (const viewport of VIEWPORTS) {
            const screenshotPath = path.join(APP_ROOT, "docs", "screenshots", `${routeName(route)}-${viewport.width}.png`);
            const result = await checkPage(browser, { baseUrl, route, viewport, screenshotPath, axeFile });
            console.log(`  ${result.failures.length ? "FAIL" : "ok  "} ${route} @ ${viewport.width}`);
            report.pages.push(result);
          }
        }
      }
    }
  } catch (err) {
    console.error(`\nsmoke crashed: ${err?.stack ?? err}`);
    report.failures.push(String(err?.message ?? err));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server && (!opts.keepOpen || interrupted)) await killTree(server.child).catch(() => {});
  }

  const ok = printSummary(report);
  resultCode = ok ? 0 : 1;
  if (opts.keepOpen && server && server.child.exitCode === null) {
    console.log(`\nPreview server still running (--keep-open): http://127.0.0.1:${app.previewPort}`);
    console.log("Press Ctrl+C to stop it.");
    await new Promise(() => {}); // the SIGINT handler stops the server and exits with resultCode
  }
  return resultCode;
}

if (process.env.RCENE_SMOKE_NO_MAIN !== "1") {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(err);
      process.exitCode = 1;
    },
  );
}
