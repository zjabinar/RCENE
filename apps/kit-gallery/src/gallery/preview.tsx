import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CheckIcon, CodeIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { LANG_LABELS, LANGS, LangOverride, useLang, useLangOverride, useT, type Lang } from "@rcene/i18n";
import { Surface } from "@rcene/kit";
import { cn, ErrorBoundary, toast } from "@rcene/ui";
import { Badge } from "@rcene/ui/components/badge";
import { Button } from "@rcene/ui/components/button";
import { PALETTES, type Mode, type Palette } from "@rcene/ui/theme";
import { strings } from "../i18n/strings.ts";
import type { GalleryEntry } from "./registry.ts";

export interface PreviewSettings {
  palette: Palette | "app";
  mode: Mode | "app";
  width: "fit" | "phone";
  lang: Lang | "app" | "all";
}

export const DEFAULT_SETTINGS: PreviewSettings = { palette: "app", mode: "app", width: "fit", lang: "app" };

const SELECT =
  "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/** Palette, mode, width and language for one preview. Native selects: compact and fully accessible. */
export function PreviewControls({ name, value, onChange }: { name: string; value: PreviewSettings; onChange: (next: PreviewSettings) => void }) {
  const t = useT(strings);
  const set = <K extends keyof PreviewSettings>(key: K, v: PreviewSettings[K]) => onChange({ ...value, [key]: v });
  return (
    <fieldset className="flex flex-wrap items-end gap-3">
      <legend className="sr-only">{t("preview.controls", { name })}</legend>
      <Field label={t("preview.palette")}>
        {(id) => (
          <select id={id} className={SELECT} value={value.palette} onChange={(e) => set("palette", e.target.value as PreviewSettings["palette"])}>
            <option value="app">{t("preview.followApp")}</option>
            {PALETTES.map((p) => (
              <option key={p} value={p}>
                {t(`ui.palette.${p}` as never)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t("preview.mode")}>
        {(id) => (
          <select id={id} className={SELECT} value={value.mode} onChange={(e) => set("mode", e.target.value as PreviewSettings["mode"])}>
            <option value="app">{t("preview.followApp")}</option>
            <option value="light">{t("ui.mode.light" as never)}</option>
            <option value="dark">{t("ui.mode.dark" as never)}</option>
          </select>
        )}
      </Field>
      <Field label={t("preview.width")}>
        {(id) => (
          <select id={id} className={SELECT} value={value.width} onChange={(e) => set("width", e.target.value as PreviewSettings["width"])}>
            <option value="fit">{t("preview.fit")}</option>
            <option value="phone">{t("preview.phone")}</option>
          </select>
        )}
      </Field>
      <Field label={t("preview.lang")}>
        {(id) => (
          <select id={id} className={SELECT} value={value.lang} onChange={(e) => set("lang", e.target.value as PreviewSettings["lang"])}>
            <option value="app">{t("preview.followApp")}</option>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_LABELS[l]}
              </option>
            ))}
            <option value="all">{t("preview.allLangs")}</option>
          </select>
        )}
      </Field>
    </fieldset>
  );
}

/** The query string the frame route reads (src/pages/Frame.tsx). */
export function frameQuery(settings: PreviewSettings): string {
  const q = new URLSearchParams();
  if (settings.palette !== "app") q.set("palette", settings.palette);
  if (settings.mode !== "app") q.set("mode", settings.mode);
  if (settings.lang !== "app" && settings.lang !== "all") q.set("lang", settings.lang);
  const s = q.toString();
  return s ? `?${s}` : "";
}

function InLang({ lang, children }: { lang: Lang | "app"; children: ReactNode }) {
  if (lang === "app") return <>{children}</>;
  return (
    <LangOverride lang={lang}>
      <div lang={lang}>{children}</div>
    </LangOverride>
  );
}

/** The example itself: inline in the page's width, or in a 390 px frame (real phone breakpoints). */
export function PreviewCanvas({ entry, settings }: { entry: GalleryEntry; settings: PreviewSettings }) {
  const t = useT(strings);
  const { Example, meta } = entry;

  if (settings.width === "phone") {
    const langs: (Lang | "app")[] = settings.lang === "all" ? [...LANGS] : [settings.lang];
    return (
      <div className="flex flex-wrap justify-center gap-4 overflow-x-auto rounded-xl bg-muted p-4">
        {langs.map((lang) => (
          <figure key={lang} className="flex flex-col items-center gap-2">
            <iframe
              title={t("preview.frameTitle", { name: meta.title })}
              src={`/frame/${entry.family}/${entry.slug}${frameQuery({ ...settings, lang })}`}
              width={390}
              height={meta.frameHeight ?? 640}
              className="max-w-full rounded-[1.75rem] border-4 border-foreground/80 bg-background shadow-overlay"
            />
            {settings.lang === "all" && <figcaption className="text-xs text-muted-foreground">{LANG_LABELS[lang as Lang]}</figcaption>}
          </figure>
        ))}
      </div>
    );
  }

  const scoped = settings.palette !== "app" || settings.mode !== "app";
  const body = (lang: Lang | "app") => (
    <ErrorBoundary>
      <InLang lang={lang}>
        <Example />
      </InLang>
    </ErrorBoundary>
  );
  return (
    <Surface
      palette={settings.palette === "app" ? undefined : settings.palette}
      mode={settings.mode === "app" ? undefined : settings.mode}
      className={cn("overflow-hidden rounded-xl border", !scoped && "bg-background")}
    >
      {settings.lang === "all" ? (
        <div className="grid divide-y">
          {LANGS.map((lang) => (
            <section key={lang} aria-label={LANG_LABELS[lang]} className={cn(!meta.bleed && "p-4 sm:p-6")}>
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{LANG_LABELS[lang]}</p>
              {body(lang)}
            </section>
          ))}
        </div>
      ) : (
        <div className={cn(!meta.bleed && "p-4 sm:p-6")}>{body(settings.lang as Lang | "app")}</div>
      )}
    </Surface>
  );
}

/** The source, scrollable by keyboard, with a copy button. */
export function CodeBlock({ code, label }: { code: string; label: string }) {
  const t = useT(strings);
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(t("preview.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("preview.copyFailed"));
    }
  }
  return (
    <div className="relative">
      <pre
        tabIndex={0}
        aria-label={label}
        className="max-h-[32rem] overflow-auto rounded-xl border bg-muted p-4 pr-28 font-mono text-xs leading-relaxed text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <code>{code}</code>
      </pre>
      <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={copy}>
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        {t("preview.copy")}
      </Button>
    </div>
  );
}

/** One example: title, summary, the blocks it shows, its preview settings, the preview and the code. */
export function ExampleCard({ entry, standalone = false }: { entry: GalleryEntry; standalone?: boolean }) {
  const t = useT(strings);
  const [chosen] = useLang();
  const lang = useLangOverride() ?? chosen;
  const [settings, setSettings] = useState<PreviewSettings>(DEFAULT_SETTINGS);
  const [showCode, setShowCode] = useState(standalone);
  const headingId = useId();
  const codeId = useId();
  const Heading = standalone ? "h2" : "h3";
  const summary = entry.meta.summary[lang] ?? entry.meta.summary.en;

  return (
    <section aria-labelledby={headingId} id={entry.slug} className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-raised sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Heading id={headingId} className="font-display text-xl font-semibold tracking-tight">
            {entry.meta.title}
          </Heading>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{summary}</p>
          <ul aria-label={t("preview.blocks")} className="mt-2 flex flex-wrap gap-1.5">
            {entry.meta.blocks.map((b) => (
              <li key={b}>
                <Badge variant="secondary" className="font-mono">
                  {b}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" aria-expanded={showCode} aria-controls={codeId} onClick={() => setShowCode((v) => !v)}>
            <CodeIcon aria-hidden="true" />
            {showCode ? t("preview.hideCode") : t("preview.code")}
          </Button>
          {!standalone && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/${entry.family}/${entry.slug}`}>
                <ExternalLinkIcon aria-hidden="true" />
                {t("preview.open")}
                <span className="sr-only">: {entry.meta.title}</span>
              </Link>
            </Button>
          )}
        </div>
      </header>
      <PreviewControls name={entry.meta.title} value={settings} onChange={setSettings} />
      <PreviewCanvas entry={entry} settings={settings} />
      <div id={codeId} hidden={!showCode}>
        {showCode && <CodeBlock code={entry.source} label={`${entry.meta.title}: ${t("preview.code")}`} />}
      </div>
    </section>
  );
}
