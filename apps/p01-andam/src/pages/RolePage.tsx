import { ConstructionIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
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
    <section aria-labelledby={`role-${role}-heading`} className={cn("flex flex-col gap-3", full && "p-4 sm:p-6")}>
      <h1 id={`role-${role}-heading`} className="text-2xl font-semibold tracking-tight">
        {t(`role.${role}.title`)}
      </h1>
      <p className="text-muted-foreground">{t(`role.${role}.summary`)}</p>
      <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
        <ConstructionIcon aria-hidden="true" className="size-4 shrink-0" />
        {t("role.placeholder")}
      </p>
    </section>
  );
}
