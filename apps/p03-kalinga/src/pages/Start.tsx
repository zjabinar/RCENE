import { RoleLauncher } from "@rcene/ui";
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
