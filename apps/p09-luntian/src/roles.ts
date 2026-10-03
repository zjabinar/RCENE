/**
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
  { id: "resident", path: "/resident", width: "phone" },
  { id: "enro", path: "/enro", width: "full" },
  { id: "planner", path: "/planner", width: "full" },
] as const satisfies readonly RoleDef[];

export type Role = (typeof ROLES)[number];
export type RoleId = Role["id"];

/** The role whose route the pathname is in (by its first segment), or null for "/" and "/sources". */
export function roleForPath(pathname: string): Role | null {
  const first = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  return ROLES.find((role) => role.path === first) ?? null;
}
