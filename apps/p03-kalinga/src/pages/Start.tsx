import { RoleLauncher } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { strings } from "../i18n/strings.ts";
import { ROLES } from "../roles.ts";

/** "/": the role launcher. Each role opens here or in its own sized window. */
export function Start() {
  const t = useT(strings);
  return (
    <section aria-labelledby="start-heading" className="flex flex-col gap-6">
      <header>
        <h1 id="start-heading" className="text-2xl font-semibold tracking-tight">
          {t("start.heading")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("start.hint")}</p>
      </header>
      <RoleLauncher
        windowPrefix="p03-kalinga"
        roles={ROLES.map((role) => ({
          id: role.id,
          to: role.path,
          width: role.width,
          title: t(`role.${role.id}.title`),
          summary: t(`role.${role.id}.summary`),
        }))}
      />
    </section>
  );
}
