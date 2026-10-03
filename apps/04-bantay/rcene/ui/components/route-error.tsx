import { HouseIcon } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { useT } from "@rcene/i18n";

import { useUiStrings } from "../i18n.ts";
import { Button } from "./ui/button.tsx";
import { ErrorState } from "./states.tsx";

/** For a route's `errorElement`: the translated error state with a link home (and a reload unless it's a 404). */
export function RouteError() {
  const error = useRouteError();
  const t = useT(useUiStrings());
  const response = isRouteErrorResponse(error) ? error : null;
  const detail = response ? `${response.status} ${response.statusText}`.trim() : error;

  return (
    <div data-slot="route-error" className="flex min-h-svh items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md">
        <ErrorState error={detail} onRetry={response?.status === 404 ? undefined : () => window.location.reload()}>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <HouseIcon aria-hidden="true" />
              {t("ui.home")}
            </Link>
          </Button>
        </ErrorState>
      </div>
    </div>
  );
}
