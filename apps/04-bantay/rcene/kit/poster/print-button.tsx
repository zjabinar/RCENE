import type { ComponentProps } from "react";
import { Printer } from "lucide-react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";
import { Button } from "@rcene/ui/components/button";

import { useKitStrings } from "../i18n.ts";

export interface PrintButtonProps {
  /** Button text; default "Print" (kit.printButton.label). */
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}

/** Calls window.print() (Chrome/Edge: save as PDF). Never printed itself. */
export function PrintButton({ label, variant = "default", size = "default", className }: PrintButtonProps) {
  const t = useT(useKitStrings());
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      data-slot="print-button"
      className={cn("print:hidden", className)}
      onClick={() => window.print()}
    >
      <Printer aria-hidden="true" />
      {label ?? t("kit.printButton.label")}
    </Button>
  );
}
