import type { CSSProperties } from "react";
import { CircleCheckIcon, InfoIcon, LoaderCircleIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useT } from "@rcene/i18n";

import { useUiStrings } from "../../i18n.ts";

/**
 * shadcn Toaster without next-themes: colors come from the theme tokens, and
 * every sonner prop passes through (e.g. theme="dark", position="top-center").
 * The region's screen-reader label is translated. AppShell already mounts one;
 * show toasts with `import { toast } from "@rcene/ui"`.
 */
function Toaster({ ...props }: ToasterProps) {
  const t = useT(useUiStrings());
  return (
    <Sonner
      className="toaster group"
      containerAriaLabel={t("ui.notifications")}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <LoaderCircleIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
export type { ToasterProps };
