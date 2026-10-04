/**
 * The starting src/ of a platform (manifest rows with kind "platform", P1-P10).
 *
 * new-app copies apps/_template as for any app, then writes these files over it:
 * a role launcher at "/", one placeholder page per role route, the nav, the role
 * strings in three languages, a spine store and a roles test. They are app-owned
 * (like all of src/), so sync-shared never touches them after generation.
 *
 * Everything comes from the manifest row: slug, title, tagline and
 * roles[] = { id, path, width: "phone" | "wide" | "full", title: {en, war, fil}, summary: {en, war, fil} }.
 */

const LANGS = ["en", "war", "fil"];
const WIDTHS = new Set(["phone", "wide", "full"]);

/** Fixed strings of the platform scaffold (the Waray and Filipino ones are AI drafts). */
const SCAFFOLD_STRINGS = {
  en: {
    "nav.start": "Start",
    "start.heading": "Choose a role",
    "start.hint":
      "Each role is one view of the same live data. For the demo, open each role in its own window and place the windows side by side.",
    "role.placeholder": "This view is not built yet. Its requirements are in docs/brief.md.",
  },
  war: {
    "nav.start": "Umpisa",
    "start.heading": "Pilia an papel",
    "start.hint":
      "Kada papel usa nga pagtan-aw han pareho nga buhi nga datos. Para ha demo, ablihi an kada papel ha kalugaringon nga window ngan ibutang an mga window nga magkatupad.",
    "role.placeholder": "Waray pa nahimo ini nga view. Aadi an mga kinahanglan hini ha docs/brief.md.",
  },
  fil: {
    "nav.start": "Simula",
    "start.heading": "Pumili ng tungkulin",
    "start.hint":
      "Bawat tungkulin ay isang view ng parehong live na datos. Para sa demo, buksan ang bawat tungkulin sa sariling window at ilagay ang mga window nang magkatabi.",
    "role.placeholder": "Hindi pa nagagawa ang view na ito. Nasa docs/brief.md ang mga kinakailangan nito.",
  },
};

/** Files the platform scaffold removes from the template copy (the template's map demo). */
export const PLATFORM_REMOVED = ["src/pages/Home.tsx"];

const str = (s) => JSON.stringify(String(s));

/** Throws when a row's roles cannot produce a valid scaffold. */
export function validateRoles(row) {
  const roles = row.roles;
  if (!Array.isArray(roles) || roles.length === 0) throw new Error(`${row.slug}: a platform row needs a non-empty "roles" array`);
  const ids = new Set();
  const paths = new Set();
  for (const r of roles) {
    if (!/^[a-z][a-z0-9]*$/.test(String(r.id))) throw new Error(`${row.slug}: role id "${r.id}" must be lowercase letters and digits`);
    if (!/^\/[a-z][a-z0-9-]*$/.test(String(r.path))) throw new Error(`${row.slug}: role path "${r.path}" must be one segment like "/console"`);
    if (["/sources"].includes(r.path)) throw new Error(`${row.slug}: role path "${r.path}" is reserved`);
    if (!WIDTHS.has(r.width)) throw new Error(`${row.slug}: role "${r.id}" width must be phone, wide or full`);
    for (const lang of LANGS) {
      if (!r.title?.[lang] || !r.summary?.[lang]) throw new Error(`${row.slug}: role "${r.id}" needs title and summary in ${LANGS.join(", ")}`);
    }
    if (ids.has(r.id) || paths.has(r.path)) throw new Error(`${row.slug}: duplicate role id or path "${r.id}" ${r.path}`);
    ids.add(r.id);
    paths.add(r.path);
  }
  return roles;
}

function stringsTs(row, roles) {
  const table = (lang) => {
    const entries = [];
    if (lang === "en") {
      entries.push(["app.title", row.title], ["app.tagline", row.tagline ?? ""]);
    }
    for (const [k, v] of Object.entries(SCAFFOLD_STRINGS[lang])) entries.push([k, v]);
    for (const r of roles) {
      entries.push([`role.${r.id}.title`, r.title[lang]], [`role.${r.id}.summary`, r.summary[lang]]);
    }
    return entries.map(([k, v]) => `    ${str(k)}: ${str(v)},`).join("\n");
  };
  return `/**
 * Every user-facing string for this platform. English is the source; Waray and
 * Filipino are AI drafts until a fluent reviewer checks them: list each drafted key
 * in NOTES.md under "Translations to review" (corrections go in rcene/i18n/REVIEW.md).
 * Hazard-answer strings go under status.*, level.*, answer.* or result.* (strings.test.ts
 * checks them for "safe" in every language). Lifted modules bring their own keys:
 * merge them here under the module's prefix.
 */
import { common, extendStrings } from "@rcene/i18n";

export const strings = extendStrings(common, {
  en: {
${table("en")}
  },
  war: {
${table("war")}
  },
  fil: {
${table("fil")}
  },
});
`;
}

function rolesTs(roles) {
  const rows = roles.map((r) => `  { id: ${str(r.id)}, path: ${str(r.path)}, width: ${str(r.width)} },`).join("\n");
  return `/**
 * This platform's roles: one route and, in the demo, one window each (from project.json "roles").
 * Titles and summaries are role.<id>.title / role.<id>.summary in src/i18n/strings.ts.
 * Keep the ids and paths: the smoke routes, the nav and DEMO.md use them.
 */
import type { AppShellWidth } from "@rcene/ui";

export interface RoleDef {
  id: string;
  /** One segment, e.g. "/console". Add sub-routes (e.g. "/center/:id") under it. */
  path: string;
  /** The AppShell width of this role's views; also sizes its window on the launcher. */
  width: AppShellWidth;
}

export const ROLES = [
${rows}
] as const satisfies readonly RoleDef[];

export type Role = (typeof ROLES)[number];
export type RoleId = Role["id"];

/** The role whose route the pathname is in (by its first segment), or null for "/" and "/sources". */
export function roleForPath(pathname: string): Role | null {
  const first = \`/\${pathname.split("/").filter(Boolean)[0] ?? ""}\`;
  return ROLES.find((role) => role.path === first) ?? null;
}
`;
}

function rolesTestTs(roles) {
  const first = roles[0];
  return `import { describe, expect, it } from "vitest";
import { LANGS } from "@rcene/i18n";
import { strings } from "./i18n/strings.ts";
import { ROLES, roleForPath } from "./roles.ts";

describe("roles", () => {
  it("have unique ids and one-segment paths", () => {
    expect(new Set(ROLES.map((r) => r.id)).size).toBe(ROLES.length);
    expect(new Set(ROLES.map((r) => r.path)).size).toBe(ROLES.length);
    for (const r of ROLES) expect(r.path).toMatch(/^\\/[a-z][a-z0-9-]*$/);
  });

  it("have a title and a summary in every language", () => {
    for (const lang of LANGS) {
      const table = strings[lang] as Record<string, string | undefined>;
      for (const r of ROLES) {
        expect(table[\`role.\${r.id}.title\`], \`\${lang} \${r.id}\`).toBeTruthy();
        expect(table[\`role.\${r.id}.summary\`], \`\${lang} \${r.id}\`).toBeTruthy();
      }
    }
  });

  it("finds the role of a route, including its sub-routes", () => {
    expect(roleForPath(${str(first.path)})?.id).toBe(${str(first.id)});
    expect(roleForPath(${str(`${first.path}/x`)})?.id).toBe(${str(first.id)});
    expect(roleForPath("/")).toBeNull();
    expect(roleForPath("/sources")).toBeNull();
  });
});
`;
}

function startTsx(row) {
  return `import { RoleLauncher } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { strings } from "../i18n/strings.ts";
import { ROLES } from "../roles.ts";

/** "/": the role launcher. Each role opens here or in its own sized window. */
export function Start() {
  const t = useT(strings);
  return (
    <section className="flex flex-col gap-2">
      <PageHeader title={t("start.heading")} description={t("start.hint")} />
      <RoleLauncher
        windowPrefix=${str(row.slug)}
        roles={ROLES.map((role) => ({
          id: role.id,
          to: role.path,
          width: role.width,
          title: t(\`role.\${role.id}.title\`),
          summary: t(\`role.\${role.id}.summary\`),
        }))}
      />
    </section>
  );
}
`;
}

function rolePageTsx() {
  return `import { useT } from "@rcene/i18n";
import { IllustratedState, PageHeader } from "@rcene/kit/app";
import { cn } from "@rcene/ui";
import { strings } from "../i18n/strings.ts";
import { ROLES, type RoleDef, type RoleId } from "../roles.ts";

/**
 * Placeholder for one role's view. Replace it with the real page from docs/brief.md
 * (in src/pages/ or src/features/) and point the role's route in src/routes.tsx at it.
 */
export function RolePage({ role }: { role: RoleId }) {
  const t = useT(strings);
  const roles: readonly RoleDef[] = ROLES;
  const full = roles.find((r) => r.id === role)?.width === "full";
  return (
    <section className={cn("flex flex-col gap-2", full && "p-4 sm:p-6")}>
      <PageHeader title={t(\`role.\${role}.title\`)} description={t(\`role.\${role}.summary\`)} />
      <IllustratedState spot="empty" size="sm" title={t("role.placeholder")} />
    </section>
  );
}
`;
}

function routesTsx(roles) {
  const children = roles.map((r) => `      { path: ${str(r.path.slice(1))}, element: <RolePage role=${str(r.id)} /> },`).join("\n");
  return `/**
 * Route table. Exported (not rendered here) so it can be mounted elsewhere later.
 * "/" is the role launcher; each role has its own route (replace the RolePage
 * placeholders with the real views, and add sub-routes like "center/:id" next to them).
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { AppLayout } from "./AppLayout.tsx";
import { RolePage } from "./pages/RolePage.tsx";
import { Sources } from "./pages/Sources.tsx";
import { Start } from "./pages/Start.tsx";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Start /> },
${children}
      { path: "sources", element: <Sources /> },
    ],
  },
];
`;
}

function appLayoutTsx() {
  return `import { Outlet, useLocation } from "react-router";
import { AppShell } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { AppMark } from "@rcene/kit/brand";
import { strings } from "./i18n/strings.ts";
import { ROLES, roleForPath } from "./roles.ts";

/**
 * One shell for every role: the width follows the role of the current route (phone,
 * wide or full). Pass layers={[…]} once the views use real layers, so the "Sample data"
 * badge only checks those.
 */
export function AppLayout() {
  const t = useT(strings);
  const { pathname } = useLocation();
  const role = roleForPath(pathname);
  return (
    <AppShell
      title={t("app.title")}
      tagline={t("app.tagline")}
      width={role?.width ?? "wide"}
      brand={<AppMark size={32} />}
      showReset
      nav={[
        { to: "/", label: t("nav.start"), end: true },
        ...ROLES.map((r) => ({ to: r.path, label: t(\`role.\${r.id}.title\`) })),
        { to: "/sources", label: t("app.sources") },
      ]}
      strings={strings}
    >
      <Outlet />
    </AppShell>
  );
}
`;
}

function storeTs(row) {
  return `/**
 * The spine: the one store every role's view reads and writes (docs/brief.md, "Spine").
 * It is persisted and synced across this app's windows, which is how one role's action
 * shows up in another role's window. Key per-barangay records by barangay. Keep static
 * data (layers) out of here, only state. Grow it requirement by requirement.
 */
import { createSyncedStore } from "@rcene/store";

export interface SpineState {
  /** When any role last changed the spine (ms since epoch), for "updated just now" labels. */
  updatedAt: number | null;
  touch: () => void;
}

export const useSpine = createSyncedStore<SpineState>(
  ${str(`${row.slug}:spine`)},
  (set) => ({
    updatedAt: null,
    touch: () => set({ updatedAt: Date.now() }),
  }),
  { version: 1 },
);
`;
}

/** Appended to the template's NOTES.md for a platform. */
export const LIFTED_MODULES_NOTES = `
## Lifted modules

Every module copied from a finished app (see "Lift, then wire" in docs/brief.md).

| Module app | Commit | Files (from → to) | Changes after lifting |
|---|---|---|---|
| (none yet) | | | |
`;

/** Map<rel, text> of the platform's src/ files (written over the template copy). */
export function platformSources(row) {
  const roles = validateRoles(row);
  return new Map([
    ["src/i18n/strings.ts", stringsTs(row, roles)],
    ["src/roles.ts", rolesTs(roles)],
    ["src/roles.test.ts", rolesTestTs(roles)],
    ["src/pages/Start.tsx", startTsx(row)],
    ["src/pages/RolePage.tsx", rolePageTsx()],
    ["src/routes.tsx", routesTsx(roles)],
    ["src/AppLayout.tsx", appLayoutTsx()],
    ["src/store.ts", storeTs(row)],
  ]);
}
