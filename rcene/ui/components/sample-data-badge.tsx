import { FlaskConicalIcon } from "lucide-react";
import { useDataManifest, usesFixtures, type LayerName } from "@rcene/data";
import { useAppStrings, useT } from "@rcene/i18n";

import { Badge } from "./ui/badge.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.tsx";

export interface SampleDataBadgeProps {
  /** Layers this screen uses. Omit to show the badge when ANY served file is a fixture. */
  layers?: readonly LayerName[];
  className?: string;
}

/** Amber "Sample data" badge, shown only while fixtures stand in for real data. */
export function SampleDataBadge({ layers, className }: SampleDataBadgeProps) {
  const t = useT(useAppStrings());
  const manifest = useDataManifest();
  const show = layers
    ? usesFixtures(manifest, layers)
    : manifest !== null && Object.values(manifest.files).includes("fixture");
  if (!show) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="warning" tabIndex={0} data-slot="sample-data-badge" className={className}>
          <FlaskConicalIcon aria-hidden="true" />
          {t("app.sampleData")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{t("app.sampleDataHint")}</TooltipContent>
    </Tooltip>
  );
}
