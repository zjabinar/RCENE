/**
 * Mirrors the canonical data (root data/files, data/fixtures, data/README.md)
 * into an app's data/ folder. Data is not app-owned: the app copy is replaced
 * file by file and anything the root does not have is deleted.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { repoPaths, sha256, walk } from "./apps.mjs";

const IGNORED = new Set([".DS_Store", "Thumbs.db"]);
const ignore = (rel) => IGNORED.has(rel.split("/").pop());

/** Source files of the mirror, as POSIX paths relative to data/. */
export function dataSourceFiles(root) {
  const dataDir = repoPaths(root).data;
  const files = [];
  for (const sub of ["files", "fixtures"]) {
    for (const f of walk(path.join(dataDir, sub), { exclude: ignore })) files.push(`${sub}/${f}`);
  }
  if (existsSync(path.join(dataDir, "README.md"))) files.push("README.md");
  return files.sort();
}

function sameFile(a, b) {
  if (!existsSync(b)) return false;
  const sa = statSync(a);
  const sb = statSync(b);
  if (!sb.isFile() || sa.size !== sb.size) return false;
  return sha256(readFileSync(a)) === sha256(readFileSync(b));
}

function removeEmptyDirs(dir, keep) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name), keep);
  }
  if (!keep.has(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
}

/**
 * Mirrors root data/ into <targetDir>/data/. Returns { copied, deleted, unchanged, files }.
 * With dryRun nothing is written.
 */
export function mirrorData(srcRoot, targetDir, { dryRun = false } = {}) {
  const srcData = repoPaths(srcRoot).data;
  const destData = path.join(targetDir, "data");
  const wanted = dataSourceFiles(srcRoot);
  const wantedSet = new Set(wanted);
  const result = { copied: [], deleted: [], unchanged: 0, files: wanted.length };

  for (const rel of wanted) {
    const src = path.join(srcData, ...rel.split("/"));
    const dest = path.join(destData, ...rel.split("/"));
    if (sameFile(src, dest)) {
      result.unchanged++;
      continue;
    }
    result.copied.push(rel);
    if (!dryRun) {
      mkdirSync(path.dirname(dest), { recursive: true });
      if (existsSync(dest) && statSync(dest).isDirectory()) rmSync(dest, { recursive: true, force: true });
      copyFileSync(src, dest);
    }
  }
  for (const rel of walk(destData, { exclude: () => false })) {
    if (wantedSet.has(rel)) continue;
    result.deleted.push(rel);
    if (!dryRun) rmSync(path.join(destData, ...rel.split("/")), { force: true });
  }
  if (!dryRun && existsSync(destData)) {
    removeEmptyDirs(destData, new Set([destData, path.join(destData, "files"), path.join(destData, "fixtures")]));
  }
  return result;
}
