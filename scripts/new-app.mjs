#!/usr/bin/env node
/**
 * Generates apps/<slug>/ from apps/_template for rows of docs/projects/projects.json.
 *
 *   node scripts/new-app.mjs 01-ligtas            # one app
 *   node scripts/new-app.mjs --all                # every app row
 *   node scripts/new-app.mjs --all --force        # regenerate, even started apps (careful)
 *   node scripts/new-app.mjs --template           # only rewrite apps/_template/package.json
 *
 * An app counts as "started" when its STATUS.md no longer says "Not started";
 * started apps are skipped unless --force is given. After generating, run
 * `pnpm install` so the lockfile picks up the new workspace package.
 *
 * Placeholders replaced in every text file: __ID__ __SLUG__ __TITLE__
 * __TAGLINE__ __PORT__ __BRIEF__. Placeholders only ever sit inside strings or
 * prose, so apps/_template itself still typechecks and builds. The dev port is
 * not stamped into vite.config.ts: @rcene/config/vite reads it from projects.json.
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(path.join(root, "docs/projects/projects.json"), "utf8"));
const templateDir = path.join(root, "apps/_template");

const CORE = {
  dependencies: [
    "@gsap/react",
    "@hookform/resolvers",
    "@turf/turf",
    "gsap",
    "lucide-react",
    "maplibre-gl",
    "motion",
    "react",
    "react-dom",
    "react-hook-form",
    "react-map-gl",
    "react-router",
    "zod",
    "zustand",
  ],
  workspace: ["@rcene/data", "@rcene/geo", "@rcene/i18n", "@rcene/map", "@rcene/store", "@rcene/ui"],
  devDependencies: [
    "@tailwindcss/vite",
    "@types/geojson",
    "@types/node",
    "@types/react",
    "@types/react-dom",
    "@vitejs/plugin-react",
    "jsdom",
    "tailwindcss",
    "typescript",
    "vite",
    "vitest",
  ],
  devWorkspace: ["@rcene/config"],
};

const sorted = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

function packageJson(project) {
  const deps = {};
  const devDeps = {};
  for (const name of CORE.dependencies) deps[name] = "catalog:";
  for (const name of CORE.workspace) deps[name] = "workspace:*";
  for (const name of CORE.devDependencies) devDeps[name] = "catalog:";
  for (const name of CORE.devWorkspace) devDeps[name] = "workspace:*";
  for (const extra of project.extras ?? []) {
    const spec = manifest.extras[extra];
    if (!spec) throw new Error(`Unknown extra "${extra}" for ${project.slug}`);
    for (const name of spec.dependencies ?? []) deps[name] = "catalog:";
    for (const name of spec.devDependencies ?? []) devDeps[name] = "catalog:";
  }
  return {
    name: `@rcene/${project.slug}`,
    private: true,
    version: "0.0.0",
    type: "module",
    description: project.tagline,
    scripts: {
      dev: "vite",
      build: "tsc -b && vite build",
      typecheck: "tsc -b",
      preview: "vite preview",
      test: "vitest run",
    },
    dependencies: sorted(deps),
    devDependencies: sorted(devDeps),
  };
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      out.push(...walkFiles(abs));
    } else out.push(abs);
  }
  return out;
}

const TEXT = /\.(tsx?|jsx?|mjs|json|md|html|css|svg|txt)$/;

function fill(text, project) {
  return text
    .replaceAll("__ID__", project.id)
    .replaceAll("__SLUG__", project.slug)
    .replaceAll("__TITLE__", project.title)
    .replaceAll("__TAGLINE__", project.tagline)
    .replaceAll("__PORT__", String(project.port))
    .replaceAll("__BRIEF__", project.brief);
}

function isStarted(appDir) {
  const status = path.join(appDir, "STATUS.md");
  return existsSync(status) && !readFileSync(status, "utf8").includes("Not started");
}

function generate(project, force) {
  const appDir = path.join(root, project.app);
  if (existsSync(appDir) && isStarted(appDir) && !force) {
    console.log(`skip ${project.slug} (started; use --force to overwrite)`);
    return;
  }
  if (existsSync(appDir)) {
    // Keep node_modules (pnpm links) so a regenerate doesn't force a reinstall.
    for (const entry of readdirSync(appDir)) {
      if (entry !== "node_modules") rmSync(path.join(appDir, entry), { recursive: true, force: true });
    }
  }
  cpSync(templateDir, appDir, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|dist)([\\/]|$)/.test(src),
  });
  for (const file of walkFiles(appDir)) {
    if (!TEXT.test(file) || statSync(file).size > 512_000) continue;
    const before = readFileSync(file, "utf8");
    const after = fill(before, project);
    if (after !== before) writeFileSync(file, after);
  }
  writeFileSync(path.join(appDir, "package.json"), JSON.stringify(packageJson(project), null, 2) + "\n");
  const extras = project.extras?.length ? `, extras: ${project.extras.join(", ")}` : "";
  console.log(`wrote ${project.app} (port ${project.port}${extras})`);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const apps = manifest.projects.filter((p) => p.kind === "app");

if (args.includes("--template")) {
  const template = { id: "00", slug: "template", title: "RCENE template", tagline: "Generic app template", port: 5100, extras: [] };
  const pkg = packageJson(template);
  writeFileSync(path.join(templateDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  console.log("wrote apps/_template/package.json");
} else {
  const wanted = args.includes("--all") ? apps : apps.filter((p) => args.includes(p.slug) || args.includes(p.id));
  if (wanted.length === 0) {
    console.error("Usage: node scripts/new-app.mjs <slug|id>... | --all [--force] | --template");
    process.exit(1);
  }
  for (const project of wanted) generate(project, force);
  console.log("Next: pnpm install");
}
