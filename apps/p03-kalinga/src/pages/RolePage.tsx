import { useT } from "@rcene/i18n";
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
      <PageHeader title={t(`role.${role}.title`)} description={t(`role.${role}.summary`)} />
      <IllustratedState spot="empty" size="sm" title={t("role.placeholder")} />
    </section>
  );
}
