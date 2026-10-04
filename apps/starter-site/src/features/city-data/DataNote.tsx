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
  /** "center" under a centred section, "start" (default) elsewhere. */
  align?: "start" | "center";
  className?: string;
}

export function DataNote({ caveats = [], align = "start", className }: DataNoteProps) {
  const t = useT(strings);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-sm leading-relaxed text-pretty text-muted-foreground",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <p className="flex items-start gap-2">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {t("data.computedHere")} <SampleDataBadge layers={CITY_LAYERS} className="ms-1 align-middle" />
        </span>
      </p>
      {caveats.map((caveat, i) => (
        <p key={i}>
          {caveat}
        </p>
      ))}
    </div>
  );
}
