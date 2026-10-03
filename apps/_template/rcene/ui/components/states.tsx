import type { ReactNode } from "react";
import { CircleXIcon, FileQuestionMarkIcon, InboxIcon, LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import type { LoadState } from "@rcene/data";
import { common, useT } from "@rcene/i18n";

import { cn } from "../lib/utils.ts";
import { Button } from "./ui/button.tsx";

export interface LoadingStateProps {
  /** Defaults to the translated "Loading…". */
  label?: string;
  className?: string;
}

/** Spinner + text, announced politely (role="status"). */
export function LoadingState({ label, className }: LoadingStateProps) {
  const t = useT(common);
  return (
    <div
      role="status"
      data-slot="loading-state"
      className={cn("flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground", className)}
    >
      <LoaderCircleIcon className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      <span>{label ?? t("state.loading")}</span>
    </div>
  );
}

export interface EmptyStateProps {
  /** Defaults to the translated "Nothing to show yet." */
  title?: string;
  /** Extra description or actions under the title. */
  children?: ReactNode;
  className?: string;
}

export function EmptyState({ title, children, className }: EmptyStateProps) {
  const t = useT(common);
  return (
    <div
      role="status"
      data-slot="empty-state"
      className={cn("flex flex-col items-center justify-center gap-3 px-4 py-10 text-center", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <InboxIcon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium">{title ?? t("state.empty")}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

function errorDetail(error: unknown): string | null {
  if (error == null) return null;
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  return null;
}

export interface ErrorStateProps {
  /** Error, string or anything thrown. Its message is shown as a small detail line. */
  error?: unknown;
  /** Shows a "Try again" button when given. */
  onRetry?: () => void;
  /** Extra actions (e.g. a link home), rendered next to the retry button. */
  children?: ReactNode;
  className?: string;
}

/** Translated "Something went wrong." + optional detail and retry, announced assertively (role="alert"). */
export function ErrorState({ error, onRetry, children, className }: ErrorStateProps) {
  const t = useT(common);
  const detail = errorDetail(error);
  return (
    <div
      role="alert"
      data-slot="error-state"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm",
        className,
      )}
    >
      <CircleXIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-medium">{t("state.error")}</p>
        {detail && <p className="text-xs break-words text-muted-foreground">{detail}</p>}
        {(onRetry || children) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onRetry && (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RotateCcwIcon aria-hidden="true" />
                {t("state.retry")}
              </Button>
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export interface DataMissingProps {
  /** Layer (or hazard) name, shown as a small code label. */
  layer?: string;
  className?: string;
}

/** Translated "This data layer is not available yet." for a layer whose file is absent. */
export function DataMissing({ layer, className }: DataMissingProps) {
  const t = useT(common);
  return (
    <div
      role="status"
      data-slot="data-missing"
      data-layer={layer}
      className={cn(
        "flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <FileQuestionMarkIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0">
        {t("state.dataMissing")}
        {layer && (
          <>
            {" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs break-all">{layer}</code>
          </>
        )}
      </p>
    </div>
  );
}

export interface LoadGateProps<T> {
  state: LoadState<T>;
  /** Rendered once the data is ready. */
  children: (data: T) => ReactNode;
  /** Replaces the default <LoadingState/> (e.g. a skeleton). Pass null to render nothing. */
  loading?: ReactNode;
  /** Passed to <ErrorState/> on a load error. */
  onRetry?: () => void;
}

/** Renders loading, missing-layer, error or the data, from a `useLayer`/`useZones` state. */
export function LoadGate<T>({ state, children, loading, onRetry }: LoadGateProps<T>): ReactNode {
  switch (state.status) {
    case "loading":
      return loading !== undefined ? loading : <LoadingState />;
    case "missing":
      return <DataMissing layer={state.error.layer} />;
    case "error":
      return <ErrorState error={state.error} onRetry={onRetry} />;
    case "ready":
      return children(state.data);
  }
}
