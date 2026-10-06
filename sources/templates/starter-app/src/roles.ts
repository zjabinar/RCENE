/**
 * The roles of this app: one route each and, in the demo, one window each. The
 * launcher on "/" opens them, and AppLayout sizes the shell from the role of the
 * current route. Titles and summaries are role.<id>.title / role.<id>.summary in
 * src/i18n/strings.ts.
 */
import type { AppShellWidth } from "@rcene/ui";
import type { Palette } from "@rcene/ui/theme";

export interface RoleDef {
  id: string;
  /** One segment, e.g. "/console". Sub-routes ("/console/:id") belong to the same role. */
  path: string;
  /** The AppShell width of the role's views; also sizes its window on the launcher. */
  width: AppShellWidth;
  /** A palette the role's views force (public boards use the high-contrast "malinaw"). */
  palette?: Palette;
}

export const ROLES = [
  { id: "console", path: "/console", width: "full" },
  { id: "resident", path: "/resident", width: "phone" },
  { id: "board", path: "/board", width: "full", palette: "malinaw" },
] as const satisfies readonly RoleDef[];

export type Role = (typeof ROLES)[number];
export type RoleId = Role["id"];

/** The role whose route holds `pathname` (by its first segment), or null for "/" and "/sources". */
export function roleForPath(pathname: string): RoleDef | null {
  const first = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  return ROLES.find((role) => role.path === first) ?? null;
}
