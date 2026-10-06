import { useId, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { SearchIcon, XIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { IllustratedState, PageHeader } from "@rcene/kit/app";
import { Button } from "@rcene/ui/components/button";
import { Input } from "@rcene/ui/components/input";
import { Label } from "@rcene/ui/components/label";
import { findRecord, normalizeCode, type RequestRecord } from "@/domain/records.ts";
import { CategoryLabel, StatusBadge } from "@/features/requests/badges.tsx";
import { RequestTimeline } from "@/features/requests/RequestTimeline.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

/**
 * /resident (phone width): look up one request by its code. The code lives in the URL
 * (?code=REC-0001), so the QR on the record page and the board opens straight to it, and
 * the view follows the record live when the office moves it along in another window.
 */
export function Resident() {
  const t = useT(strings);
  const [params, setParams] = useSearchParams();
  const query = params.get("code") ?? "";
  const record = useRecords((s) => (query ? findRecord(s.records, query) : undefined));
  const [draft, setDraft] = useState(query);
  const [invalid, setInvalid] = useState(false);
  // Follow the URL when it changes under us (a QR link, Back): adjust state while rendering, no effect.
  const [shownQuery, setShownQuery] = useState(query);
  if (query !== shownQuery) {
    setShownQuery(query);
    setDraft(query);
  }
  const inputId = useId();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeCode(draft);
    setInvalid(code === null);
    if (code) {
      setDraft(code);
      setParams({ code });
    }
  };

  const clear = () => {
    setDraft("");
    setInvalid(false);
    setParams({});
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("resident.title")} description={t("resident.lead")} className="pb-0 sm:pb-0" />

      <form role="search" noValidate onSubmit={onSubmit} className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-raised">
        <Label htmlFor={inputId}>{t("resident.code")}</Label>
        <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
          {t("resident.codeHint")}
        </p>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${inputId}-hint ${inputId}-error` : `${inputId}-hint`}
            className="h-11 font-semibold tracking-wide uppercase tabular-nums placeholder:normal-case"
            placeholder="REC-0001"
          />
          <Button type="submit" size="lg" className="h-11">
            <SearchIcon aria-hidden="true" />
            {t("resident.find")}
          </Button>
        </div>
        {invalid && (
          <p id={`${inputId}-error`} role="alert" className="text-sm font-medium text-destructive">
            {t("resident.invalid")}
          </p>
        )}
      </form>

      {!query ? (
        <IllustratedState spot="community" title={t("resident.startTitle")} description={t("resident.startLead")} />
      ) : record ? (
        <RequestCard record={record} />
      ) : (
        <IllustratedState
          spot="search"
          title={t("resident.notFound", { code: normalizeCode(query) ?? query })}
          description={t("resident.notFoundLead")}
          actions={
            <Button type="button" variant="outline" onClick={clear}>
              <XIcon aria-hidden="true" />
              {t("resident.clear")}
            </Button>
          }
        />
      )}
    </div>
  );
}

function RequestCard({ record }: { record: RequestRecord }) {
  const t = useT(strings);
  const fmt = useFormat();
  const updated = record.history[record.history.length - 1]!.at;
  const dates: [string, string][] = [
    [t("resident.filed"), fmt.date(new Date(record.receivedAt))],
    [t("resident.target"), fmt.date(new Date(record.dueAt))],
    [t("resident.updated"), `${fmt.date(new Date(updated))} · ${fmt.time(new Date(updated))}`],
  ];

  return (
    <article aria-labelledby="request-code" className="flex flex-col gap-5 rounded-xl border bg-card p-5 text-card-foreground shadow-raised">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 id="request-code" className="font-display text-3xl font-semibold tracking-tight tabular-nums">
            {record.code}
          </h2>
          {/* Polite live region: the status changes here when the office moves the request in another window. */}
          <p aria-live="polite" aria-atomic="true">
            <span className="sr-only">{t("resident.statusNow", { status: t(`record.status.${record.status}`) })}</span>
            <span aria-hidden="true">
              <StatusBadge status={record.status} className="mt-1.5" />
            </span>
          </p>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
          <CategoryLabel category={record.category} className="text-foreground" />
          <span aria-hidden="true">·</span>
          {record.barangay}
        </p>
      </header>

      <RequestTimeline record={record} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
        {dates.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 last:col-span-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("resident.help")}</p>
    </article>
  );
}
