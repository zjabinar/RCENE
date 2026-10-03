import { InfoIcon } from "lucide-react";
import { Link } from "react-router";
import { useAppStrings, useT } from "@rcene/i18n";

import { cn } from "../lib/utils.ts";

export interface DisclaimerFooterProps {
  /** Classes for the inner container (AppShell passes its width here). */
  className?: string;
}

/** The preparedness disclaimer plus a link to /sources. */
export function DisclaimerFooter({ className }: DisclaimerFooterProps) {
  const t = useT(useAppStrings());
  return (
    <footer data-slot="disclaimer-footer" className="border-t bg-muted/40">
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4",
          className,
        )}
      >
        <p className="flex items-start gap-1.5">
          <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>{t("app.disclaimer")}</span>
        </p>
        <Link
          to="/sources"
          className="shrink-0 font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          {t("app.sources")}
        </Link>
      </div>
    </footer>
  );
}
