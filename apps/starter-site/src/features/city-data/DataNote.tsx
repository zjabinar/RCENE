/**
 * The honesty line under any number or figure computed from the layers:
 * where it comes from, the "Sample data" badge while fixtures stand in for
 * real files, and the caveats that go with it.
 */
import type { ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { SampleDataBadge } from "@rcene/ui";
import { cn } from "@rcene/ui/lib/utils";
import { strings } from "@/i18n/strings.ts";
import { CITY_LAYERS } from "./use-city-data.ts";

export interface DataNoteProps {
  /** Extra caveats, one per line (already translated). */
  caveats?: ReactNode[];
  className?: string;
}

export function DataNote({ caveats = [], className }: DataNoteProps) {
  const t = useT(strings);
  return (
    <div className={cn("flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground", className)}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
        <span>{t("data.computedHere")}</span>
        <SampleDataBadge layers={CITY_LAYERS} />
      </p>
      {caveats.map((caveat, i) => (
        <p key={i} className="text-pretty">
          {caveat}
        </p>
      ))}
    </div>
  );
}
