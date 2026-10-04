/**
 * Vite preset for an RCENE app. Self-contained: it reads only this app's own
 * folder (project.json, data/, models/), so the folder can be copied anywhere.
 *
 *   // vite.config.ts
 *   import { fileURLToPath } from "node:url";
 *   import { rceneApp } from "./rcene/config/vite.ts";
 *   export default rceneApp({ dir: fileURLToPath(new URL(".", import.meta.url)) });
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { mergeConfig, normalizePath, type Alias, type Plugin, type PluginOption, type UserConfig } from "vite";
import { defineConfig } from "vitest/config";
import { themeBootScript } from "../ui/theme/boot.ts";
import type { ThemeDefaults } from "../ui/theme/palettes.ts";
import { rceneStatic, type StaticMount } from "./static.ts";

export interface RceneAppOptions {
  /** Absolute path of the app folder (the folder holding vite.config.ts and project.json). */
  dir: string;
  /** Dev server port. Defaults to project.json `port`. Preview uses port + 1000. */
  port?: number;
  /** Serve /models/ from ./models for in-browser AI. Defaults to project.json `ai`. */
  ai?: boolean;
  /** Extra Vite plugins, e.g. VitePWA(...). */
  plugins?: PluginOption[];
  /** Escape hatch, deep-merged last with Vite's mergeConfig (nested keys merge, they don't replace). */
  overrides?: UserConfig;
}

export interface ProjectInfo {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  port: number;
  ai?: boolean;
  brief?: string;
  branch?: string;
  smokeRoutes?: string[];
  /** Color schemes the smoke test checks ("light", "dark"); default ["light"]. */
  smokeSchemes?: string[];
  /** The app's default theme; the user's choice in the theme menu wins. */
  theme?: ThemeDefaults;
  /** "platform" for P1-P10; "gallery" and "starter" for the reference projects. */
  kind?: string;
}

/** Reads <dir>/project.json, this app's only metadata file. */
export function readProject(dir: string): ProjectInfo {
  const file = path.join(dir, "project.json");
  const project = JSON.parse(readFileSync(file, "utf8")) as ProjectInfo;
  if (!Number.isInteger(project.port)) throw new Error(`project.json in ${dir} has no numeric "port"`);
  return project;
}

/** /data/ is served from data/files first, then data/fixtures, file by file. */
export function dataMount(dir: string): StaticMount {
  return { url: "/data/", dirs: [path.join(dir, "data/files"), path.join(dir, "data/fixtures")], manifest: true };
}

/**
 * Maps the `@rcene/...` import specifiers to this app's own copy of the shared
 * code in ./rcene, most specific first. tsconfig.base.json has the same paths.
 */
export function rceneAliases(dir: string): Alias[] {
  const at = (p: string) => normalizePath(path.join(dir, p));
  return [
    { find: /^@rcene\/ui\/globals\.css$/, replacement: at("rcene/ui/styles/globals.css") },
    { find: /^@rcene\/ui\/components\/([\w-]+)$/, replacement: `${at("rcene/ui/components/ui")}/$1.tsx` },
    { find: /^@rcene\/ui\/lib\/utils$/, replacement: at("rcene/ui/lib/utils.ts") },
    { find: /^@rcene\/ui\/motion$/, replacement: at("rcene/ui/motion/index.ts") },
    { find: /^@rcene\/ui\/theme$/, replacement: at("rcene/ui/theme/index.ts") },
    { find: /^@rcene\/kit\/(app|site|poster|brand)$/, replacement: `${at("rcene/kit")}/$1/index.ts` },
    { find: /^@rcene\/data\/schemas$/, replacement: at("rcene/data/schemas.ts") },
    { find: /^@rcene\/(data|geo|i18n|kit|map|store|ui)$/, replacement: `${at("rcene")}/$1/index.ts` },
    { find: /^@\//, replacement: `${at("src")}/` },
  ];
}

/**
 * Injects the theme boot script at the top of <head>, so the stored or default
 * palette and light/dark mode are on <html> before the first paint (no flash).
 */
export function rceneTheme(defaults: ThemeDefaults | undefined): Plugin {
  return {
    name: "rcene-theme",
    transformIndexHtml() {
      return [
        { tag: "meta", attrs: { name: "theme-color", content: "#f7f2e8" }, injectTo: "head-prepend" },
        { tag: "script", children: themeBootScript(defaults), injectTo: "head-prepend" },
      ];
    },
  };
}

export function rceneApp(options: RceneAppOptions): UserConfig {
  const project = readProject(options.dir);
  const port = options.port ?? project.port;
  const ai = options.ai ?? Boolean(project.ai);
  const mounts: StaticMount[] = [dataMount(options.dir)];
  if (ai) mounts.push({ url: "/models/", dirs: [path.join(options.dir, "models")] });

  const config = defineConfig({
    plugins: [react(), tailwindcss(), rceneStatic(mounts), rceneTheme(project.theme), ...(options.plugins ?? [])],
    resolve: {
      alias: rceneAliases(options.dir),
      dedupe: ["react", "react-dom", "react-router", "zustand", "maplibre-gl"],
    },
    server: { port, strictPort: true },
    preview: { port: port + 1000, strictPort: true },
    build: { chunkSizeWarningLimit: 1500 },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}", "rcene/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
      passWithNoTests: true,
    },
  }) as UserConfig;
  return options.overrides ? mergeConfig(config, options.overrides) : config;
}
