#!/usr/bin/env node
/**
 * Smoke test: the definition-of-done gate every app session runs.
 *
 *   node scripts/smoke.mjs --app 01-ligtas
 *   node scripts/smoke.mjs --app 01-ligtas --app template --route / --route /sources
 *   node scripts/smoke.mjs --app 01 --no-build --keep-open
 *   (from an app folder: node ../../scripts/smoke.mjs --app 01-ligtas)
 *
 * For each app (`template` means apps/_template):
 *   1. pnpm --filter <pkg> build            (skipped with --no-build)
 *   2. vite preview on the preview port      (dev port + 1000; template 6100)
 *   3. headless browser with every non-localhost request aborted (offline check)
 *   4. each route at 390x844 and 1280x800: no console or page errors, the map
 *      canvas (if any) is not blank, no serious/critical axe violations, and a
 *      screenshot in apps/<slug>/docs/screenshots/<route>-<width>.png
 *   5. PASS/FAIL summary; exit code 1 on any failure
 * The preview server is always stopped (with --keep-open: when you press Ctrl+C).
 *
 * Only playwright and Node built-ins. Works on Windows (Edge) and Linux (Chromium).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

const USAGE = `Usage: node scripts/smoke.mjs --app <slug|id|template> [--app ...] [--route /path ...] [--no-build] [--keep-open]

  --app <x>      app to check: a slug (01-ligtas), an id (01) or "template"; repeatable
  --route <p>    route to visit (default: / and /sources); repeatable
  --no-build     reuse the existing dist/ instead of running pnpm build
  --keep-open    leave the preview server(s) running until Ctrl+C`;

// ---------------------------------------------------------------------------
// Arguments and app resolution
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const opts = { apps: [], routes: [], build: true, keepOpen: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined || (inline === undefined && v.startsWith("--"))) throw new Error(`${flag} needs a value`);
      return v;
    };
    switch (flag) {
      case "--app":
        opts.apps.push(value());
        break;
      case "--route":
        opts.routes.push(normalizeRoute(value()));
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
  if (!opts.help && opts.apps.length === 0) throw new Error("Give at least one --app");
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

export function resolveApp(arg, manifest, root = ROOT) {
  let slug;
  let port;
  if (arg === "template" || arg === "_template") {
    slug = "_template";
    port = 5100;
  } else {
    const rows = (manifest.projects ?? []).filter((p) => p.kind === "app");
    const row = rows.find((p) => p.slug === arg) ?? rows.find((p) => p.id === arg) ?? rows.find((p) => p.slug.startsWith(`${arg}-`));
    if (!row) throw new Error(`No app "${arg}" in docs/projects/projects.json (use a slug like 01-ligtas, an id like 01, or "template")`);
    if (!row.port) throw new Error(`App "${row.slug}" has no port in projects.json`);
    slug = row.slug;
    port = row.port;
  }
  const dir = path.join(root, "apps", slug);
  const pkgFile = path.join(dir, "package.json");
  if (!existsSync(pkgFile)) throw new Error(`Missing ${path.relative(root, pkgFile)}; generate the app with scripts/new-app.mjs first`);
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8")).name;
  return { slug, dir, pkg, port, previewPort: port + 1000 };
}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

function pnpm(args, options) {
  // On Windows pnpm is a .cmd shim, so it needs a shell; pass one command string
  // (args are plain words here) to avoid Node's DEP0190 warning.
  return WIN ? [["pnpm", ...args].join(" "), [], { ...options, shell: true }] : ["pnpm", args, options];
}

function build(app) {
  console.log(`\n> pnpm --filter ${app.pkg} build`);
  const [cmd, args, options] = pnpm(["--filter", app.pkg, "build"], { cwd: ROOT, stdio: "inherit", windowsHide: true });
  const result = spawnSync(cmd, args, options);
  if (result.error) console.error(`  could not run pnpm: ${result.error.message}`);
  return result.status === 0;
}

function startPreview(app) {
  const args = ["--filter", app.pkg, "exec", "vite", "preview", "--port", String(app.previewPort), "--strictPort", "--host", "127.0.0.1"];
  console.log(`> pnpm ${args.join(" ")}`);
  const [cmd, cmdArgs, options] = pnpm(args, {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: !WIN, // own process group on POSIX so the whole tree can be killed
  });
  const child = spawn(cmd, cmdArgs, options);
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
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
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

const AXE_PATH = path.join(ROOT, "node_modules", "axe-core", "axe.min.js");

export async function axeViolations(page, axePath = AXE_PATH) {
  await page.addScriptTag({ path: axePath });
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

export async function checkPage(browser, { baseUrl, route, viewport, screenshotPath }) {
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
      result.axe = await axeViolations(page);
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
  const shot = r.screenshot ? path.relative(ROOT, r.screenshot).split(path.sep).join("/") : "-";
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

function printSummary(reports) {
  console.log("\n================ smoke summary ================");
  let failed = false;
  let pages = 0;
  for (const rep of reports) {
    const appFailed = rep.failures.length > 0 || rep.pages.some((p) => p.failures.length);
    failed ||= appFailed;
    console.log(`\n${appFailed ? "FAIL" : "PASS"}  ${rep.app.slug} (${rep.app.pkg})  preview http://127.0.0.1:${rep.app.previewPort}`);
    for (const f of rep.failures) console.log(`  x ${f}`);
    for (const line of rep.serverOutput ?? []) console.log(`    | ${line}`);
    for (const p of rep.pages) printPage(p);
    pages += rep.pages.length;
  }
  console.log(`\n${failed ? "SMOKE FAIL" : "SMOKE PASS"}: ${reports.length} app(s), ${pages} page check(s)`);
  return !failed;
}

// ---------------------------------------------------------------------------

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    return 2;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  const manifest = JSON.parse(readFileSync(path.join(ROOT, "docs", "projects", "projects.json"), "utf8"));
  let apps;
  try {
    apps = opts.apps.map((a) => resolveApp(a, manifest));
  } catch (err) {
    console.error(err.message);
    return 2;
  }
  const routes = opts.routes.length ? opts.routes : DEFAULT_ROUTES;
  const { chromium } = await import("playwright");

  const servers = [];
  const stopAll = async () => {
    for (const s of servers) await killTree(s.child).catch(() => {});
  };
  let interrupted = false;
  process.once("SIGINT", () => {
    interrupted = true;
    stopAll().finally(() => process.exit(130));
  });

  const reports = [];
  let browser;
  try {
    for (const app of apps) {
      const report = { app, failures: [], pages: [] };
      reports.push(report);
      console.log(`\n=== ${app.slug} (${app.pkg}) ===`);
      if (opts.build && !build(app)) {
        report.failures.push("build failed (see output above)");
        continue;
      }
      if (await httpAnswers(app.previewPort)) {
        report.failures.push(`port ${app.previewPort} is already in use: stop the other preview (or a previous --keep-open run) first`);
        continue;
      }
      const server = startPreview(app);
      servers.push(server);
      try {
        await waitForPort(app.previewPort, server.child);
      } catch (err) {
        report.failures.push(`vite preview did not start: ${err.message}`);
        report.serverOutput = server.output.slice(-20);
        await killTree(server.child);
        continue;
      }
      browser ??= await launchBrowser(chromium);
      const baseUrl = `http://127.0.0.1:${app.previewPort}`;
      for (const route of routes) {
        for (const viewport of VIEWPORTS) {
          const screenshotPath = path.join(app.dir, "docs", "screenshots", `${routeName(route)}-${viewport.width}.png`);
          const result = await checkPage(browser, { baseUrl, route, viewport, screenshotPath });
          console.log(`  ${result.failures.length ? "FAIL" : "ok  "} ${route} @ ${viewport.width}`);
          report.pages.push(result);
        }
      }
      if (!opts.keepOpen) await killTree(server.child);
    }
  } catch (err) {
    console.error(`\nsmoke crashed: ${err?.stack ?? err}`);
    reports.push({ app: { slug: "smoke", pkg: "-", previewPort: "-" }, failures: [String(err?.message ?? err)], pages: [] });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (!opts.keepOpen || interrupted) await stopAll();
  }

  const ok = printSummary(reports);
  if (opts.keepOpen && servers.some((s) => s.child.exitCode === null)) {
    console.log("\nPreview server(s) still running (--keep-open):");
    for (const rep of reports) if (rep.app.previewPort !== "-") console.log(`  http://127.0.0.1:${rep.app.previewPort}`);
    console.log("Press Ctrl+C to stop them.");
    await new Promise(() => {}); // SIGINT handler stops the servers and exits
  }
  return ok ? 0 : 1;
}

// Set RCENE_SMOKE_NO_MAIN=1 to import the helpers without running a smoke test.
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
