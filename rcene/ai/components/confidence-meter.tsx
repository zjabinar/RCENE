import { useId } from "react";
import { useFormat, useT } from "@rcene/i18n";
import { Progress } from "@rcene/ui/components/progress";
import { cn } from "@rcene/ui/lib/utils";
import { useAiStrings } from "../strings.ts";

export type ConfidenceBand = "low" | "medium" | "high";

/** low below 0.5, medium below 0.75, high from 0.75. */
export function confidenceBand(value: number): ConfidenceBand {
  return value < 0.5 ? "low" : value < 0.75 ? "medium" : "high";
}

export interface ConfidenceMeterProps {
  /** 0 to 1. */
  value: number;
  className?: string;
}

/** "Confidence 82% · High" over a bar. The number and the word carry the meaning, not the colour. */
export function ConfidenceMeter({ value, className }: ConfidenceMeterProps) {
  const t = useT(useAiStrings());
  const fmt = useFormat();
  const id = useId();
  const clamped = Math.max(0, Math.min(1, value));
  const text = t("ai.confidence.value", { pct: fmt.percent(clamped), band: t(`ai.confidence.${confidenceBand(clamped)}`) });
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={id} className="text-muted-foreground">
          {t("ai.card.confidence")}
        </span>
        <span className="font-semibold tabular-nums">{text}</span>
      </div>
      <Progress value={Math.round(clamped * 100)} aria-labelledby={id} aria-valuetext={text} />
    </div>
  );
}
