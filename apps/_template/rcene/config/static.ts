/**
 * Serves this app's static folders (data layers, AI models) at fixed URLs.
 *
 * A mount maps a URL prefix to one or more directories. Earlier directories win,
 * which is how real data in data/files overrides the fake fixtures in
 * data/fixtures, file by file.
 *
 * With `manifest: true`, `<prefix>manifest.json` lists every file and whether it
 * came from the first directory ("real") or a later one ("fixture"). The UI uses
 * it to show a "Sample data" badge.
 *
 * Dev: a middleware streams files from disk. Build: files are emitted into dist.
 */
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export interface StaticMount {
  /** URL prefix with leading and trailing slash, e.g. "/data/". */
  url: string;
  /** Directories in priority order. Missing directories are skipped. */
  dirs: string[];
  /** Serve and emit `<url>manifest.json` describing where each file came from. */
  manifest?: boolean;
}

export type FileOrigin = "real" | "fixture";

export interface StaticManifest {
  files: Record<string, FileOrigin>;
}

const CONTENT_TYPES: Record<string, string> = {
  ".geojson": "application/geo+json",
  ".json": "application/json",
  ".pbf": "application/x-protobuf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bin": "application/octet-stream",
  ".onnx": "application/octet-stream",
  ".wasm": "application/wasm",
  ".mjs": "text/javascript",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const IGNORED = new Set([".gitkeep", "README.md", ".DS_Store", "Thumbs.db"]);

/** Lists files under `dir` as POSIX-style paths relative to it. */
export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (abs: string, rel: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) continue;
      const childAbs = path.join(abs, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(childAbs, childRel);
      else out.push(childRel);
    }
  };
  walk(dir, "");
  return out.sort();
}

/** Merges the mount's directories: first directory wins per file. */
export function resolveMount(mount: StaticMount): Map<string, { abs: string; origin: FileOrigin }> {
  const files = new Map<string, { abs: string; origin: FileOrigin }>();
  mount.dirs.forEach((dir, index) => {
    for (const rel of listFiles(dir)) {
      if (files.has(rel)) continue;
      files.set(rel, { abs: path.join(dir, rel), origin: index === 0 ? "real" : "fixture" });
    }
  });
  return files;
}

export function buildManifest(mount: StaticMount): StaticManifest {
  const files: Record<string, FileOrigin> = {};
  for (const [rel, { origin }] of resolveMount(mount)) files[rel] = origin;
  return { files };
}

function contentType(file: string): string {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/** Rejects path traversal and returns the relative path inside the mount. */
function relativeRequest(urlPath: string, prefix: string): string | null {
  let rel: string;
  try {
    rel = decodeURIComponent(urlPath.slice(prefix.length));
  } catch {
    return null; // malformed escape: not ours, let Vite answer
  }
  // Backslashes and drive letters would survive posix normalisation and then be
  // interpreted by path.join on Windows, escaping the mount.
  if (!rel || rel.includes("\0") || rel.includes("\\") || /^[a-zA-Z]:/.test(rel)) return null;
  const normalized = path.posix.normalize(rel);
  if (normalized.startsWith("..") || path.posix.isAbsolute(normalized)) return null;
  return normalized;
}

export function rceneStatic(mounts: StaticMount[]): Plugin {
  return {
    name: "rcene-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url ?? "").split("?")[0] ?? "";
        const mount = mounts.find((m) => urlPath.startsWith(m.url));
        if (!mount) return next();
        const rel = relativeRequest(urlPath, mount.url);
        if (!rel) return next();

        if (mount.manifest && rel === "manifest.json") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(buildManifest(mount)));
          return;
        }
        for (const dir of mount.dirs) {
          const abs = path.join(dir, rel);
          const stat = existsSync(abs) ? statSync(abs) : null;
          if (stat?.isFile()) {
            res.setHeader("Content-Type", contentType(abs));
            // Lets fetch() report download progress (e.g. Transformers.js model loading).
            res.setHeader("Content-Length", String(stat.size));
            res.setHeader("Cache-Control", "no-store");
            createReadStream(abs).pipe(res);
            return;
          }
        }
        res.statusCode = 404;
        res.end(`Not found: ${urlPath}`);
      });
    },
    generateBundle() {
      for (const mount of mounts) {
        const base = mount.url.replace(/^\/+/, "");
        for (const [rel, { abs }] of resolveMount(mount)) {
          this.emitFile({ type: "asset", fileName: `${base}${rel}`, source: readFileSync(abs) });
        }
        if (mount.manifest) {
          this.emitFile({
            type: "asset",
            fileName: `${base}manifest.json`,
            source: JSON.stringify(buildManifest(mount)),
          });
        }
      }
    },
  };
}
