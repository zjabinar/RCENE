import { useState, type ReactNode } from "react";
import { MoveHorizontalIcon } from "lucide-react";
import { useT } from "@rcene/i18n";
import { Slider } from "@rcene/ui/components/slider";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface BeforeAfterProps {
  /** Shown left of the divider: an <img className="size-full object-cover" />, a map, any node. */
  before: ReactNode;
  /** Shown right of the divider. Sets the frame's size (keep both the same size). */
  after: ReactNode;
  /** Already translated, e.g. "2019". Shown as a chip and used in the slider's name. */
  beforeLabel: string;
  afterLabel: string;
  /** Divider position in percent from the left. Default 50. */
  initial?: number;
  /** Called with the new position (0–100) while it moves. */
  onChange?: (percent: number) => void;
  /** Classes for the frame, e.g. "aspect-video". */
  className?: string;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/**
 * A compare slider: `before` is revealed over `after` up to the divider
 * (a clip-path, so any node works). The divider is the `slider` primitive:
 * drag it, click anywhere on the frame (mouse) or use the arrow keys,
 * Home/End and Page Up/Down. Labels sit on both sides.
 */
export function BeforeAfter({ before, after, beforeLabel, afterLabel, initial = 50, onChange, className }: BeforeAfterProps) {
  const t = useT(useKitStrings());
  const [pos, setPos] = useState(() => clamp(initial));

  return (
    <figure data-slot="before-after" className="flex flex-col gap-3">
      <div
        data-slot="before-after-frame"
        className={cn(
          "group/ba relative isolate overflow-hidden rounded-xl border bg-muted shadow-raised select-none [&_img]:pointer-events-none [&_img]:select-none",
          className,
        )}
      >
        <div data-slot="before-after-after" className="size-full [&>*]:size-full">
          {after}
        </div>
        <div
          data-slot="before-after-before"
          className="absolute inset-0 [&>*]:size-full"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          {before}
        </div>

        <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-raised backdrop-blur sm:text-sm">
          {beforeLabel}
        </span>
        <span className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-raised backdrop-blur sm:text-sm">
          {afterLabel}
        </span>

        {/*
          The divider line and its grip are drawn here, exactly at the clip edge.
          The slider's own thumb is a narrow invisible pill inside the grip
          (so Radix's in-bounds offset stays tiny); its keyboard focus shows as
          a ring on the grip.
        */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-10 w-0" style={{ left: `${pos}%` }}>
          <div className="absolute inset-y-0 -left-px w-0.5 bg-background shadow-[0_0_0_1px_var(--border)]" />
          <div className="absolute top-1/2 left-0 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-overlay transition-[box-shadow,scale] duration-200 group-has-[[role=slider]:active]/ba:scale-110 group-has-[[role=slider]:focus-visible]/ba:ring-4 group-has-[[role=slider]:focus-visible]/ba:ring-ring motion-reduce:group-has-[[role=slider]:active]/ba:scale-100">
            <MoveHorizontalIcon className="size-5" />
          </div>
        </div>

        <Slider
          value={[pos]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => {
            const next = clamp(v ?? pos);
            setPos(next);
            onChange?.(next);
          }}
          aria-label={t("kit.beforeAfter.slider", { before: beforeLabel, after: afterLabel })}
          className={cn(
            "absolute inset-x-0 top-1/2 z-20 h-16 -translate-y-1/2 cursor-ew-resize pointer-fine:top-0 pointer-fine:h-full pointer-fine:translate-y-0",
            "[&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent",
            "[&_[data-slot=slider-thumb]]:h-11 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:cursor-grab [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-transparent [&_[data-slot=slider-thumb]]:shadow-none [&_[data-slot=slider-thumb]]:outline-none [&_[data-slot=slider-thumb]]:hover:ring-0 [&_[data-slot=slider-thumb]]:focus-visible:ring-0 [&_[data-slot=slider-thumb]]:focus-visible:outline-none [&_[data-slot=slider-thumb]]:active:cursor-grabbing",
          )}
        />
      </div>
      <figcaption className="flex items-center gap-2 text-sm text-muted-foreground">
        <MoveHorizontalIcon aria-hidden="true" className="size-4 shrink-0" />
        {t("kit.beforeAfter.hint")}
      </figcaption>
    </figure>
  );
}
