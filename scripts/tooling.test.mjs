/**
 * Tests for the repo-root app tooling: scripts/lib/*, new-app, sync-shared,
 * sync-data, lockfiles (--check), stack and check-standalone (static).
 * The end-to-end part builds a tiny fake repo (template, manifest, stack.json,
 * docs, data) in a temp folder and runs the real scripts against it with --root,
 * so it needs no network and no install.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { stripJsComments, jsSpecifiers, parseJsonc, staticCheck, allowedMention } from "./check-standalone.mjs";
import {
  fillPlaceholders,
  isExcluded,
  managedGroup,
  packageManagedSubset,
  proposalSection,
  withManagedFields,
  findApp,
} from "./lib/apps.mjs";
import { renameLock, EXACT } from "./lib/lock.mjs";
import { platformSources, validateRoles } from "./lib/platform.mjs";
import { splitArgs } from "./smoke.mjs";
import { scriptFeatures } from "./fetch-models.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = (name) => path.join(here, name);

function run(name, args) {
  const r = spawnSync(process.execPath, [script(name), ...args], { encoding: "utf8", timeout: 60000 });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

describe("lib/apps", () => {
  const row = { id: "07", slug: "07-pila", title: "Pila", tagline: "Queue", port: 5107 };

  it("fills every placeholder; the brief is the app's own copy", () => {
    expect(fillPlaceholders("__ID__ __SLUG__ __TITLE__ __TAGLINE__ __PORT__ __BRIEF__", row)).toBe("07 07-pila Pila Queue 5107 docs/brief.md");
  });

  it("excludes installs, builds, models, screenshots, local settings and the lock", () => {
    for (const p of ["node_modules/x", "src/node_modules/y", "dist/a.js", ".vite/x", "models/Xenova/a.onnx", "docs/screenshots/home-390.png", ".claude/settings.local.json", "package-lock.json", "tsconfig.app.tsbuildinfo", "coverage/x", ".playwright-mcp/x", ".sync.json"]) {
      expect(isExcluded(p), p).toBe(true);
    }
    for (const p of ["models/.gitkeep", "docs/screenshots/.gitkeep", "src/main.tsx", ".claude/settings.json", "rcene/data/index.ts"]) {
      expect(isExcluded(p), p).toBe(false);
    }
  });

  it("classifies managed files into groups and leaves app-owned files alone", () => {
    expect(managedGroup("rcene/ui/index.ts")).toBe("rcene");
    expect(managedGroup("scripts/smoke.mjs")).toBe("scripts");
    expect(managedGroup(".claude/skills/x/SKILL.md")).toBe("claude");
    expect(managedGroup(".mcp.json")).toBe("claude");
    expect(managedGroup("CLAUDE.md")).toBe("claude");
    expect(managedGroup("tsconfig.app.json")).toBe("config");
    expect(managedGroup("index.html")).toBe("config");
    expect(managedGroup("docs/brief.md")).toBe("docs");
    expect(managedGroup("docs/modules/01-ligtas.md")).toBe("docs");
    expect(managedGroup("package.json")).toBe("package");
    for (const p of ["src/main.tsx", "public/favicon.svg", "data/files/x.geojson", "project.json", "STATUS.md", "NOTES.md", "AI-LOG.md", "DEMO.md", "docs/plan.md", ".claude/settings.local.json"]) {
      expect(managedGroup(p), p).toBe(null);
    }
  });

  it("cuts one proposal section out of PROPOSALS.md", () => {
    const text = "# P\n\n### 1. One — a\n- one\n\n### 2. Two — b\n- two\n\n## Next part\n### 20. Twenty\n- twenty\n\n---\n\n## After\n";
    expect(proposalSection(text, 2)).toContain("# Proposal 2. Two — b");
    expect(proposalSection(text, 2)).toContain("- two");
    expect(proposalSection(text, 2)).not.toContain("Next part");
    expect(proposalSection(text, 20)).toContain("- twenty");
    expect(proposalSection(text, 20)).not.toContain("After");
    expect(proposalSection(text, 3)).toBe(null);
  });

  it("cuts a platform section (### P<n>.) without matching ### 1.", () => {
    const text = "### 1. One — a\n- one\n\n### P1. Andam — b\n- platform\n\n### P10. Ten — c\n- ten\n";
    expect(proposalSection(text, "P1")).toContain("# Proposal P1. Andam — b");
    expect(proposalSection(text, "P1")).toContain("(P1 of P1–P10)");
    expect(proposalSection(text, "P1")).not.toContain("- ten");
    expect(proposalSection(text, "P10")).toContain("- ten");
    expect(proposalSection(text, 1)).not.toContain("platform");
  });

  it("owns only stack packages and template scripts in package.json", () => {
    const managed = { engines: { node: ">=22.18" }, scripts: { dev: "vite" }, dependencies: { react: "19.3.0" }, devDependencies: { vite: "8.3.2" } };
    const app = { name: "@rcene/x", engines: { node: ">=22.18" }, scripts: { dev: "vite", e2e: "node e2e.mjs" }, dependencies: { react: "19.2.0", nanoid: "6.0.1" }, devDependencies: { vite: "8.3.2" } };
    expect(packageManagedSubset(app, managed)).toEqual({ engines: { node: ">=22.18" }, scripts: { dev: "vite" }, dependencies: { react: "19.2.0" }, devDependencies: { vite: "8.3.2" } });
    const merged = withManagedFields(app, managed);
    expect(merged.name).toBe("@rcene/x");
    expect(merged.dependencies).toEqual({ nanoid: "6.0.1", react: "19.3.0" });
    expect(merged.scripts).toEqual({ dev: "vite", e2e: "node e2e.mjs" });
  });

  it("finds apps by slug, id, short id and prefix", () => {
    const manifest = { projects: [{ id: "05", slug: "05-sakuna", kind: "app" }, { id: "00", slug: "00-data", kind: "data" }] };
    expect(findApp(manifest, "05-sakuna")?.slug).toBe("05-sakuna");
    expect(findApp(manifest, "05")?.slug).toBe("05-sakuna");
    expect(findApp(manifest, "5")?.slug).toBe("05-sakuna");
    expect(findApp(manifest, "apps/05-sakuna/")?.slug).toBe("05-sakuna");
    expect(findApp(manifest, "00")).toBe(null);
  });

  it("finds platforms by P id, padded id and slug", () => {
    const manifest = { projects: [{ id: "01", slug: "01-ligtas", kind: "app" }, { id: "P1", slug: "p01-andam", kind: "platform" }, { id: "P10", slug: "p10-barangay360", kind: "platform" }] };
    for (const key of ["P1", "p1", "p01", "p01-andam", "apps/p01-andam"]) expect(findApp(manifest, key)?.slug, key).toBe("p01-andam");
    expect(findApp(manifest, "p10")?.slug).toBe("p10-barangay360");
    expect(findApp(manifest, "1")?.slug).toBe("01-ligtas");
  });
});

describe("lib/platform", () => {
  const role = (id, path, width) => ({ id, path, width, title: { en: `${id} t`, war: `${id} w`, fil: `${id} f` }, summary: { en: "s", war: "s", fil: "s" } });
  const row = { id: "P1", slug: "p01-andam", title: "Andam", tagline: "Prep", kind: "platform", roles: [role("console", "/console", "full"), role("resident", "/resident", "phone")] };

  it("writes the role scaffold from the row", () => {
    const files = platformSources(row);
    expect([...files.keys()].sort()).toEqual([
      "src/AppLayout.tsx",
      "src/i18n/strings.ts",
      "src/pages/RolePage.tsx",
      "src/pages/Start.tsx",
      "src/roles.test.ts",
      "src/roles.ts",
      "src/routes.tsx",
      "src/store.ts",
    ]);
    expect(files.get("src/roles.ts")).toContain('{ id: "console", path: "/console", width: "full" },');
    expect(files.get("src/routes.tsx")).toContain('{ path: "resident", element: <RolePage role="resident" /> },');
    expect(files.get("src/i18n/strings.ts")).toContain('"role.console.title": "console w",');
    expect(files.get("src/i18n/strings.ts")).toContain('"app.title": "Andam",');
    expect(files.get("src/store.ts")).toContain('"p01-andam:spine"');
    expect(files.get("src/pages/Start.tsx")).toContain('windowPrefix="p01-andam"');
  });

  it("rejects roles that would break the scaffold", () => {
    expect(() => validateRoles({ ...row, roles: [] })).toThrow(/non-empty/);
    expect(() => validateRoles({ ...row, roles: [role("a", "/a/b", "full")] })).toThrow(/one segment/);
    expect(() => validateRoles({ ...row, roles: [role("a", "/a", "tablet")] })).toThrow(/width/);
    expect(() => validateRoles({ ...row, roles: [role("a", "/a", "full"), role("a", "/b", "full")] })).toThrow(/duplicate/);
    expect(() => validateRoles({ ...row, roles: [{ ...role("a", "/a", "full"), title: { en: "x" } }] })).toThrow(/title and summary/);
  });
});

describe("lib/lock", () => {
  it("renames a lock and recognises exact versions", () => {
    const lock = renameLock({ name: "a", packages: { "": { name: "a", version: "0.0.0" } } }, "@rcene/b");
    expect(lock.name).toBe("@rcene/b");
    expect(lock.packages[""].name).toBe("@rcene/b");
    expect(EXACT.test("1.2.3")).toBe(true);
    expect(EXACT.test("1.0.0-beta.2")).toBe(true);
    for (const v of ["^1.2.3", "~1.2.3", "*", "latest", "workspace:*", "catalog:", ">=1"]) expect(EXACT.test(v), v).toBe(false);
  });
});

describe("check-standalone parsing", () => {
  it("blanks comments but keeps strings, regexes and line numbers", () => {
    const src = 'const a = "// not a comment"; // gone\n/* gone\n too */ const r = /from "x"/;\nimport y from "./y.ts";';
    const out = stripJsComments(src);
    expect(out).toContain('"// not a comment"');
    expect(out).not.toContain("gone");
    expect(out.split("\n")).toHaveLength(4);
    expect(jsSpecifiers(out).map((s) => s.spec)).toEqual(["./y.ts"]);
  });

  it("finds static, dynamic, side-effect, require, vi.mock and new URL specifiers", () => {
    const code = 'import a from "./a.ts";\nimport "./b.css";\nconst c = await import("../c.ts");\nrequire("./d.cjs");\nvi.mock("./e.ts");\nnew URL("./f.wasm", import.meta.url);\nimport z from "zod";';
    expect(jsSpecifiers(code).map((s) => s.spec).sort()).toEqual(["../c.ts", "./a.ts", "./b.css", "./d.cjs", "./e.ts", "./f.wasm"]);
  });

  it("parses tsconfig-style JSON with comments and trailing commas", () => {
    expect(parseJsonc('{ // c\n "a": [1, 2,], /* x */ "b": "//not" , }')).toEqual({ a: [1, 2], b: "//not" });
  });

  it("allows old-repo mentions only in prose, script comments and guard test inputs", () => {
    expect(allowedMention("docs/brief.md", "see docs/projects/x.md", "briefs")).toBe(true);
    expect(allowedMention("scripts/smoke.mjs", " * no longer reads projects.json", "manifest")).toBe(true);
    expect(allowedMention("scripts/smoke.mjs", 'const f = "projects.json";', "manifest")).toBe(false);
    expect(allowedMention("scripts/hooks/guard.test.mjs", '"../../packages/ui/x.ts"', "packages")).toBe(true);
    expect(allowedMention("scripts/hooks/guard.test.mjs", '"workspace:*"', "protocol")).toBe(false);
    expect(allowedMention("rcene/data/layers.ts", "// served by @rcene/config", "config")).toBe(false);
  });
});

describe("wrappers", () => {
  it("smoke.mjs splits app selection from pass-through arguments", () => {
    expect(splitArgs(["--app", "01", "--no-build", "--app=03,05", "--route", "/x"])).toEqual({ apps: ["01", "03", "05"], pass: ["--no-build", "--route", "/x"], all: false, root: null, help: false });
  });

  it("fetch-models.mjs reads the app script's options from its help text", () => {
    expect(scriptFeatures("Usage: --model e5|clip|all [--from <dir>|cache] [--no-cache]")).toEqual({ from: true, model: true, noCache: true });
    expect(scriptFeatures("Usage: --app 06|10|20|all")).toEqual({ from: false, model: false, noCache: false });
  });
});

// ---------------------------------------------------------------------------
// End to end on a fake repo
// ---------------------------------------------------------------------------

let repo;
const write = (rel, text) => {
  const abs = path.join(repo, ...rel.split("/"));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text);
};
const read = (rel) => readFileSync(path.join(repo, ...rel.split("/")), "utf8");
const json = (v) => `${JSON.stringify(v, null, 2)}\n`;

const STACK = {
  app: { dependencies: { react: "19.3.0" }, devDependencies: { vite: "8.3.2" } },
  root: { devDependencies: { vitest: "4.1.11" } },
};

/** A lock that matches a package.json with STACK.app deps. */
function fakeLock(name) {
  return {
    name,
    version: "0.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": { name, version: "0.0.0", dependencies: STACK.app.dependencies, devDependencies: STACK.app.devDependencies, engines: { node: ">=22.18" } },
      "node_modules/react": { version: "19.3.0" },
      "node_modules/vite": { version: "8.3.2", dev: true },
    },
  };
}

beforeAll(() => {
  repo = mkdtempSync(path.join(os.tmpdir(), "rcene-tooling-"));
  write("package.json", json({ name: "rcene", private: true, devDependencies: STACK.root.devDependencies }));
  write("stack.json", json(STACK));
  write(
    "docs/projects/projects.json",
    json({
      projects: [
        { id: "00", slug: "00-data", kind: "data", batch: 0, brief: "docs/projects/00-data.md", writeScope: ["data/**"] },
        { id: "01", slug: "01-one", title: "One", tagline: "First app", kind: "app", batch: 1, port: 5101, branch: "proj/01-one", app: "apps/01-one", brief: "docs/projects/01-one.md", ai: false },
        { id: "02", slug: "02-two", title: "Two", tagline: "Second app", kind: "app", batch: 1, port: 5102, branch: "proj/02-two", app: "apps/02-two", brief: "docs/projects/02-two.md", ai: true },
        {
          id: "P1", slug: "p01-plat", title: "Plat", tagline: "A platform", kind: "platform", batch: 5, port: 5201, branch: "proj/p01-plat", app: "apps/p01-plat",
          brief: "docs/projects/p01-plat.md", ai: false, modules: ["01", "02"], smokeRoutes: ["/", "/desk", "/sources"],
          roles: [{ id: "desk", path: "/desk", width: "full", title: { en: "Desk", war: "Desk", fil: "Desk" }, summary: { en: "Work", war: "Trabaho", fil: "Trabaho" } }],
        },
        { id: "S1", slug: "starter-one", title: "Starter", tagline: "Copy from me", kind: "starter", batch: null, launch: false, port: 5301, branch: "main", app: "apps/starter-one", brief: "docs/projects/starter-one.md", ai: false, theme: { palette: "dagat" } },
      ],
    }),
  );
  write("docs/projects/01-one.md", "# Brief one\n");
  write("docs/projects/02-two.md", "# Brief two\n");
  write("docs/projects/p01-plat.md", "# Platform brief\n");
  write("docs/projects/starter-one.md", "# Starter brief\n");
  write("docs/DISCLOSURE.md", "# Disclosure\n");
  write("docs/PRD.md", "# PRD\n");
  write("docs/PROPOSALS.md", "### 1. One — first\n- p1\n\n### 2. Two — second\n- p2\n\n### P1. Plat — both\n- platform\n");
  write("data/README.md", "# Data\n");
  write("data/files/.gitkeep", "");
  write("data/fixtures/boundary.geojson", '{"type":"FeatureCollection","features":[]}\n');

  const t = "apps/_template/";
  write(`${t}package.json`, json({ name: "@rcene/template", private: true, version: "0.0.0", type: "module", engines: { node: ">=22.18" }, scripts: { build: "vite build", smoke: "node scripts/smoke.mjs" }, ...STACK.app }));
  write(`${t}package-lock.json`, json(fakeLock("@rcene/template")));
  write(`${t}project.json`, json({ id: "00", slug: "_template", title: "T", port: 5100, brief: "docs/brief.md" }));
  write(`${t}.npmrc`, "ignore-scripts=true\n");
  write(`${t}CLAUDE.md`, "# __ID__ · __TITLE__\n\n__TAGLINE__ (brief: __BRIEF__)\n");
  write(`${t}STATUS.md`, "# Status — __ID__\n\nNot started\n");
  write(`${t}NOTES.md`, "# Notes — __ID__\n");
  write(`${t}src/pages/Home.tsx`, "export const home = 1;\n");
  write(`${t}src/pages/Sources.tsx`, "export const Sources = 1;\n");
  write(`${t}index.html`, '<!doctype html><title>__TITLE__</title><link rel="icon" href="/favicon.svg"><script type="module" src="/src/main.ts"></script>\n');
  write(`${t}public/favicon.svg`, "<svg/>\n");
  write(`${t}tsconfig.json`, json({ extends: "./tsconfig.base.json", include: ["src", "rcene"] }));
  write(`${t}tsconfig.base.json`, json({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
  write(`${t}src/main.ts`, 'import { geo } from "../rcene/geo/index.ts";\nexport const slug = "__SLUG__";\nconsole.log(geo);\n');
  write(`${t}src/index.css`, '@import "tailwindcss";\n@source "../rcene";\n');
  write(`${t}rcene/geo/index.ts`, "export const geo = 1;\n");
  write(`${t}rcene/i18n/REVIEW.md`, "review\n");
  write(`${t}scripts/smoke.mjs`, "// This app no longer reads projects.json.\nconsole.log('smoke');\n");
  write(`${t}scripts/hooks/guard.mjs`, "process.exit(0);\n");
  write(`${t}.claude/settings.json`, json({ hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/scripts/hooks/guard.mjs"] }] }] } }));
  write(`${t}.mcp.json`, json({ mcpServers: { playwright: { command: "node", args: ["node_modules/@playwright/mcp/cli.js", "--isolated"] } } }));
  write(`${t}docs/brief.md`, "# Template brief\n");
  write(`${t}docs/screenshots/.gitkeep`, "");
  write(`${t}models/.gitkeep`, "");
  write(`${t}models/big.onnx`, "x");
  write(`${t}node_modules/x/index.js`, "x");
  write(`${t}data/fixtures/stale.json`, "{}");
});

afterAll(() => {
  if (repo) rmSync(repo, { recursive: true, force: true });
});

describe("new-app", () => {
  it("generates self-contained apps from the template", () => {
    const r = run("new-app.mjs", ["--all", "--root", repo]);
    expect(r.status, r.out).toBe(0);
    expect(r.out).toContain("3 written");
    const pkg = JSON.parse(read("apps/01-one/package.json"));
    expect(pkg).toMatchObject({ name: "@rcene/01-one", description: "First app", engines: { node: ">=22.18" }, ...STACK.app });
    expect(pkg.packageManager).toBeUndefined();
    expect(JSON.parse(read("apps/02-two/project.json"))).toMatchObject({ id: "02", slug: "02-two", port: 5102, ai: true, brief: "docs/brief.md", branch: "proj/02-two", smokeRoutes: ["/", "/sources"] });
    expect(read("apps/01-one/CLAUDE.md")).toBe("# 01 · One\n\nFirst app (brief: docs/brief.md)\n");
    expect(read("apps/01-one/src/main.ts")).toContain('"01-one"');
    expect(read("apps/01-one/docs/brief.md")).toBe("# Brief one\n");
    expect(read("apps/01-one/docs/proposal.md")).toContain("- p1");
    expect(read("apps/01-one/docs/PRD.md")).toBe("# PRD\n");
    expect(existsSync(path.join(repo, "apps/02-two/docs/PRD.md"))).toBe(false);
    expect(read("apps/01-one/data/fixtures/boundary.geojson")).toContain("FeatureCollection");
    expect(existsSync(path.join(repo, "apps/01-one/data/fixtures/stale.json"))).toBe(false);
    expect(existsSync(path.join(repo, "apps/01-one/models/big.onnx"))).toBe(false);
    expect(existsSync(path.join(repo, "apps/01-one/models/.gitkeep"))).toBe(true);
    expect(existsSync(path.join(repo, "apps/01-one/node_modules"))).toBe(false);
    expect(JSON.parse(read("apps/01-one/package-lock.json")).packages[""].name).toBe("@rcene/01-one");
    expect(Object.keys(JSON.parse(read("apps/01-one/.sync.json")).files)).toContain("rcene/geo/index.ts");
  });

  it("generates a platform: module briefs, role scaffold, platform project.json", () => {
    const dir = "apps/p01-plat";
    const project = JSON.parse(read(`${dir}/project.json`));
    expect(project).toMatchObject({ id: "P1", kind: "platform", modules: ["01-one", "02-two"], roles: [{ id: "desk", path: "/desk", width: "full" }] });
    expect(project.roles[0].title).toBeUndefined(); // titles live in src/i18n/strings.ts
    expect(read(`${dir}/docs/modules/01-one.md`)).toMatch(/^> \*\*Module brief\*\* \(reference\)\. This is the spec of app #01 One[\s\S]*# Brief one\n$/);
    expect(read(`${dir}/docs/modules/02-two.md`)).toContain("# Brief two");
    expect(read(`${dir}/docs/proposal.md`)).toContain("- platform");
    expect(read(`${dir}/src/roles.ts`)).toContain('{ id: "desk", path: "/desk", width: "full" },');
    expect(read(`${dir}/src/i18n/strings.ts`)).toContain('"role.desk.summary": "Trabaho",');
    expect(existsSync(path.join(repo, dir, "src/pages/Home.tsx"))).toBe(false);
    expect(read(`${dir}/NOTES.md`)).toContain("## Lifted modules");
    expect(Object.keys(JSON.parse(read(`${dir}/.sync.json`)).files)).toContain("docs/modules/01-one.md");
    // single-feature apps keep the template's pages and have no platform fields
    expect(existsSync(path.join(repo, "apps/01-one/src/pages/Home.tsx"))).toBe(true);
    expect(JSON.parse(read("apps/01-one/project.json")).kind).toBeUndefined();
  });

  it("leaves reference projects out of --all and generates one once, when named", () => {
    expect(existsSync(path.join(repo, "apps/starter-one"))).toBe(false);
    const named = run("new-app.mjs", ["S1", "--root", repo]);
    expect(named.status, named.out).toBe(0);
    expect(read("apps/starter-one/STATUS.md")).toContain("Maintained");
    const project = JSON.parse(read("apps/starter-one/project.json"));
    expect(project).toMatchObject({ kind: "starter", theme: { palette: "dagat" }, smokeSchemes: ["light", "dark"] });
    expect(existsSync(path.join(repo, "apps/starter-one/docs/proposal.md"))).toBe(false);
    write("apps/starter-one/src/main.ts", "export const mine = 1;\n");
    const again = run("new-app.mjs", ["S1", "--root", repo]);
    expect(again.out).toContain("reference project");
    expect(read("apps/starter-one/src/main.ts")).toBe("export const mine = 1;\n");
    expect(run("new-app.mjs", ["--all", "--dry-run", "--root", repo]).out).not.toContain("starter-one");
  });

  it("refuses to overwrite a started app without --force", () => {
    // The template's STATUS.md comment mentions "Not started"; only a line that is exactly that counts.
    const started = 'Phase: features\n\n<!-- Keep the "Not started" line until work begins -->\n';
    write("apps/02-two/STATUS.md", started);
    const r = run("new-app.mjs", ["02", "--root", repo]);
    expect(r.out).toContain("skip");
    expect(read("apps/02-two/STATUS.md")).toBe(started);
  });
});

describe("check-standalone, lockfiles --check, stack", () => {
  it("passes the generated apps and the template", () => {
    const r = run("check-standalone.mjs", ["--all", "--root", repo]);
    expect(r.status, r.out).toBe(0);
    expect(r.out).toContain("5 of 5 folder(s) pass");
    expect(run("lockfiles.mjs", ["--check", "--root", repo]).status).toBe(0);
    expect(run("stack.mjs", ["--check", "--root", repo]).status).toBe(0);
  });

  it("reports paths that leave the app, ranges, leftovers and symlinks", () => {
    const outsideAbs = path.join(repo, "data").split(path.sep).join("/");
    write(
      "apps/01-one/src/bad.ts",
      'import x from "../../../outside.ts";\nconst m = "assets/models";\n// import y from "../../../commented.ts";\n' +
        'const g = import.meta.glob(["./ok/*.ts", "../../../escape/*.ts"]);\n' +
        `const a = await import("${outsideAbs}");\n`,
    );
    write("apps/01-one/rcene/config/leak.ts", 'import path from "node:path";\nexport const d = (dir: string) => path.join(dir, "../../data/files");\n');
    write("apps/01-one/tsconfig.app.json", json({ extends: "../../tsconfig.base.json" }));
    const pkg = JSON.parse(read("apps/01-one/package.json"));
    pkg.dependencies.react = "^19.3.0";
    write("apps/01-one/package.json", json(pkg));
    symlinkSync(path.join(repo, "data"), path.join(repo, "apps/01-one/src/data-link"));
    const failures = staticCheck(path.join(repo, "apps/01-one")).map((f) => `${f.where} ${f.message}`);
    const has = (re) => expect(failures.some((f) => re.test(f)), `${re}\n${failures.join("\n")}`).toBe(true);
    has(/src\/bad\.ts:1 "\.\.\/\.\.\/\.\.\/outside\.ts" points outside/);
    has(/src\/bad\.ts:2 the old shared assets\/models/);
    has(/tsconfig\.app\.json extends "\.\.\/\.\.\/tsconfig\.base\.json" points outside/);
    has(/dependencies\.react "\^19\.3\.0" is not an exact version/);
    has(/package-lock\.json dependencies: react is \^19\.3\.0 in package\.json but 19\.3\.0 in the lock/);
    has(/src\/data-link is a symlink/);
    has(/src\/bad\.ts:4 "\.\.\/\.\.\/\.\.\/escape\/\*\.ts" points outside/);
    has(/src\/bad\.ts:5 ".+" is an absolute path outside/);
    has(/rcene\/config\/leak\.ts:2 path "\.\.\/\.\.\/data\/files" can leave the app folder/);
    expect(failures.some((f) => f.includes("commented.ts"))).toBe(false);
    expect(run("stack.mjs", ["--check", "--root", repo]).status).toBe(1);
    // restore
    rmSync(path.join(repo, "apps/01-one/src/bad.ts"));
    rmSync(path.join(repo, "apps/01-one/rcene/config/leak.ts"));
    rmSync(path.join(repo, "apps/01-one/tsconfig.app.json"));
    rmSync(path.join(repo, "apps/01-one/src/data-link"));
    pkg.dependencies.react = "19.3.0";
    write("apps/01-one/package.json", json(pkg));
    expect(staticCheck(path.join(repo, "apps/01-one"))).toEqual([]);
  });
});

describe("sync-shared", () => {
  it("reports freshly generated apps as in sync", () => {
    const r = run("sync-shared.mjs", ["--all", "--dry-run", "--root", repo]);
    expect(r.status, r.out).toBe(0);
    expect(r.out).toContain("0 updated, 0 created, 0 deleted, 0 open conflict(s)");
    expect(r.out).toMatch(/02-two\s+skipped \(started/);
  });

  it("updates unchanged files, creates and deletes, and leaves app changes alone", () => {
    write("apps/_template/rcene/geo/index.ts", "export const geo = 2;\n");
    write("apps/_template/rcene/geo/extra.ts", "export const extra = 1;\n");
    rmSync(path.join(repo, "apps/_template/rcene/i18n/REVIEW.md"));
    write("apps/_template/CLAUDE.md", "# __ID__ · __TITLE__ (v2)\n");
    write("apps/01-one/CLAUDE.md", "# my own notes\n"); // app change: conflict
    const pkg = JSON.parse(read("apps/01-one/package.json"));
    pkg.dependencies.nanoid = "6.0.1"; // an app extra is not a conflict
    write("apps/01-one/package.json", json(pkg));

    const dry = run("sync-shared.mjs", ["--all", "--dry-run", "--root", repo]);
    expect(dry.status).toBe(1);
    expect(dry.out).toMatch(/01-one\s+would update 1, created 1, deleted 1, conflicts 1/);
    expect(dry.out).toContain("! CLAUDE.md  changed in the app");
    expect(read("apps/01-one/rcene/geo/index.ts")).toBe("export const geo = 1;\n");

    const r = run("sync-shared.mjs", ["--all", "--root", repo]);
    expect(r.status).toBe(1);
    expect(read("apps/01-one/rcene/geo/index.ts")).toBe("export const geo = 2;\n");
    expect(read("apps/01-one/rcene/geo/extra.ts")).toBe("export const extra = 1;\n");
    expect(existsSync(path.join(repo, "apps/01-one/rcene/i18n/REVIEW.md"))).toBe(false);
    expect(read("apps/01-one/CLAUDE.md")).toBe("# my own notes\n");
    expect(JSON.parse(read("apps/01-one/package.json")).dependencies.nanoid).toBe("6.0.1");
    // the started app was skipped
    expect(read("apps/02-two/rcene/geo/index.ts")).toBe("export const geo = 1;\n");

    const report = run("sync-shared.mjs", ["--all", "--report", "--root", repo]);
    expect(report.out).toMatch(/CLAUDE\.md\s+modified/);
    expect(report.out).toMatch(/02-two \[started\]/);

    const forced = run("sync-shared.mjs", ["01", "--force", "--only", "claude", "--root", repo]);
    expect(forced.status).toBe(0);
    expect(read("apps/01-one/CLAUDE.md")).toBe("# 01 · One (v2)\n");
    const named = run("sync-shared.mjs", ["02", "--root", repo]);
    expect(named.status, named.out).toBe(0);
    expect(read("apps/02-two/rcene/geo/index.ts")).toBe("export const geo = 2;\n");
    expect(run("sync-shared.mjs", ["--all", "--include-started", "--dry-run", "--root", repo]).out).toContain("0 open conflict(s)");
  });

  it("updates a platform's copy of a module brief", () => {
    write("docs/projects/01-one.md", "# Brief one, v2\n");
    const r = run("sync-shared.mjs", ["P1", "--only", "docs", "--root", repo]);
    expect(r.status, r.out).toBe(0);
    expect(read("apps/p01-plat/docs/modules/01-one.md")).toContain("# Brief one, v2");
    write("docs/projects/01-one.md", "# Brief one\n");
    expect(run("sync-shared.mjs", ["--all", "--only", "docs", "--root", repo]).status).toBe(0);
  });

  it("drops a package stack.json no longer has, without a false conflict", () => {
    write("stack.json", json({ ...STACK, app: { dependencies: { react: "19.3.1" }, devDependencies: {} } }));
    const r = run("sync-shared.mjs", ["01", "--only", "package", "--root", repo]);
    expect(r.status, r.out).toBe(0);
    let pkg = JSON.parse(read("apps/01-one/package.json"));
    expect(pkg.dependencies).toEqual({ nanoid: "6.0.1", react: "19.3.1" });
    expect(pkg.devDependencies).toEqual({});
    expect(JSON.parse(read("apps/01-one/.sync.json")).packageKeys.packages).toEqual(["react"]);
    // and back: vite is managed again, the app was not touched, so it is restored
    write("stack.json", json(STACK));
    expect(run("sync-shared.mjs", ["01", "--only", "package", "--root", repo]).status).toBe(0);
    pkg = JSON.parse(read("apps/01-one/package.json"));
    expect(pkg.dependencies).toEqual({ nanoid: "6.0.1", react: "19.3.0" });
    expect(pkg.devDependencies).toEqual({ vite: "8.3.2" });
  });
});

describe("sync-data", () => {
  it("mirrors root data into every app and the template", () => {
    write("data/files/boundary.geojson", '{"real":true}\n');
    write("apps/01-one/data/files/old.geojson", "{}");
    const r = run("sync-data.mjs", ["--root", repo]);
    expect(r.status, r.out).toBe(0);
    for (const app of ["_template", "01-one", "02-two"]) {
      expect(read(`apps/${app}/data/files/boundary.geojson`)).toBe('{"real":true}\n');
    }
    expect(existsSync(path.join(repo, "apps/01-one/data/files/old.geojson"))).toBe(false);
    expect(existsSync(path.join(repo, "apps/_template/data/fixtures/stale.json"))).toBe(false);
    expect(run("sync-data.mjs", ["--root", repo]).out).toContain("0 folder(s) changed");
  });
});
