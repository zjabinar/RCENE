/**
 * Shared Vite preset for every RCENE app.
 *
 *   // apps/01-ligtas/vite.config.ts
 *   import { fileURLToPath } from "node:url";
 *   import { rceneApp } from "@rcene/config/vite";
 *   export default rceneApp({ dir: fileURLToPath(new URL(".", import.meta.url)) });
 *
 * The port and AI flag come from docs/projects/projects.json, looked up by the
 * app folder's name, so they are defined in exactly one place.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig, type PluginOption, type UserConfig } from "vite";
import type {} from "vitest/config";
import { rceneStatic, type StaticMount } from "./static.ts";

export interface RceneAppOptions {
  /** Absolute path of the app folder (the folder holding vite.config.ts). */
  dir: string;
  /** Dev server port. Defaults to the app's row in projects.json (template: 5100). Preview uses port + 1000. */
  port?: number;
  /** Mount /models/ from assets/models for in-browser AI. Defaults to the row's `ai` flag. */
  ai?: boolean;
  /** Extra Vite plugins, e.g. VitePWA(...) for app 06. */
  plugins?: PluginOption[];
  /** Escape hatch, deep-merged last with Vite's mergeConfig (nested keys merge, they don't replace). */
  overrides?: UserConfig;
}

export function repoRoot(appDir: string): string {
  return path.resolve(appDir, "..", "..");
}

export function dataMount(root: string): StaticMount {
  return {
    url: "/data/",
    dirs: [path.join(root, "packages/data/files"), path.join(root, "packages/data/fixtures")],
    manifest: true,
  };
}

interface ProjectRow {
  slug: string;
  port: number | null;
  ai?: boolean;
}

/** The projects.json row for an app folder, or a template default. */
export function projectFor(appDir: string): { slug: string; port: number; ai: boolean } {
  const slug = path.basename(path.resolve(appDir));
  const manifestPath = path.join(repoRoot(appDir), "docs/projects/projects.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { projects: ProjectRow[] };
  const row = manifest.projects.find((p) => p.slug === slug);
  if (row?.port) return { slug, port: row.port, ai: Boolean(row.ai) };
  if (slug === "_template") return { slug, port: 5100, ai: false };
  throw new Error(`No port for app "${slug}" in docs/projects/projects.json`);
}

export function rceneApp(options: RceneAppOptions): UserConfig {
  const root = repoRoot(options.dir);
  const project = projectFor(options.dir);
  const port = options.port ?? project.port;
  const ai = options.ai ?? project.ai;
  const mounts: StaticMount[] = [dataMount(root)];
  if (ai) mounts.push({ url: "/models/", dirs: [path.join(root, "assets/models")] });

  const config: UserConfig = {
    plugins: [react(), tailwindcss(), rceneStatic(mounts), ...(options.plugins ?? [])],
    resolve: {
      alias: { "@": path.join(options.dir, "src") },
      dedupe: ["react", "react-dom", "react-router", "zustand", "maplibre-gl"],
    },
    server: { port, strictPort: true },
    preview: { port: port + 1000, strictPort: true },
    build: { chunkSizeWarningLimit: 1500 },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      passWithNoTests: true,
    },
  };
  return defineConfig(options.overrides ? mergeConfig(config, options.overrides) : config);
}
