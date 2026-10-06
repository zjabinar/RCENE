import { Link } from "react-router";
import { FileImageIcon, PresentationIcon } from "lucide-react";
import { AiProviderChip } from "@rcene/ai";
import { RoleLauncher } from "@rcene/ui";
import { useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import { strings } from "../i18n/strings.ts";
import { ROLES } from "../roles.ts";

/** "/": the role launcher. Each role opens here or in its own sized window; the presenter links sit below. */
export function Start() {
  const t = useT(strings);
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <PageHeader title={t("start.heading")} description={t("start.hint")} />
        <RoleLauncher
          windowPrefix="andam"
          roles={ROLES.map((role) => ({
            id: role.id,
            to: role.path,
            width: role.width,
            title: t(`role.${role.id}.title`),
            summary: t(`role.${role.id}.summary`),
          }))}
        />
      </div>
      <section aria-labelledby="start-present" className="flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-raised sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-col gap-2">
          <h2 id="start-present" className="font-display text-xl font-semibold">
            {t("start.present")}
          </h2>
          <AiProviderChip to="/admin/ai" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/demo">
              <PresentationIcon aria-hidden="true" />
              {t("start.demo")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/poster">
              <FileImageIcon aria-hidden="true" />
              {t("start.poster")}
            </Link>
          </Button>
        </div>
      </section>
    </section>
  );
}
