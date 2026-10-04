import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@rcene/i18n";
import { PageHeader } from "@rcene/kit/app";
import { useTheme } from "@rcene/ui/theme";
import { DURATION, EASE, STAGGER } from "@rcene/ui/motion";
import { strings } from "../i18n/strings.ts";

/** Text tokens shown on their fill: [fill, text]. */
const PAIRS: [string, string][] = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["muted", "muted-foreground"],
  ["secondary", "secondary-foreground"],
  ["accent", "accent-foreground"],
  ["primary", "primary-foreground"],
  ["brand", "brand-foreground"],
  ["highlight", "highlight-foreground"],
  ["destructive", "destructive-foreground"],
  ["warning", "warning-foreground"],
];
/** Marks that must stand out from the page: compared with --background. */
const MARKS = ["ring", "input", "border", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "seq-1", "seq-2", "seq-3", "seq-4", "seq-5", "weave-1", "weave-2", "weave-3"];
const HAZARD: [string, string][] = [
  ["level-low", "level-low-foreground"],
  ["level-moderate", "level-moderate-foreground"],
  ["level-high", "level-high-foreground"],
  ["level-veryHigh", "level-veryHigh-foreground"],
  ["status-not-in-zone", "status-not-in-zone-foreground"],
  ["status-outside", "status-outside-foreground"],
];

function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 16);
  const [r, g, b] = [16, 8, 0].map((shift) => {
    const c = ((n >> shift) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number | null {
  const [la, lb] = [luminance(a), luminance(b)];
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The current value of every token on <html>, refreshed when the palette or mode changes. */
function useTokenValues(): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      const names = [...PAIRS.flat(), ...MARKS, ...HAZARD.flat()];
      setValues(Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()])));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "data-mode", "data-surface"] });
    return () => observer.disconnect();
  }, []);
  return values;
}

function Ratio({ value, min }: { value: number | null; min: number }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const ok = value >= min;
  return (
    <span className="font-mono tabular-nums">
      {value.toFixed(2)}:1 <span className="sr-only">{ok ? `≥ ${min}:1` : `< ${min}:1`}</span>
      <span aria-hidden="true" className={ok ? "text-foreground" : "font-bold text-destructive"}>
        {ok ? "✓" : "✗"}
      </span>
    </span>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {note && <p className="max-w-prose text-sm text-muted-foreground">{note}</p>}
      {children}
    </section>
  );
}

function TokenTable({ rows, caption }: { rows: { name: string; swatch: ReactNode; value: string; ratio: ReactNode }[]; caption: string }) {
  const t = useT(strings);
  return (
    <div tabIndex={0} role="region" aria-label={caption} className="overflow-x-auto rounded-xl border bg-card text-card-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <table className="w-full min-w-[32rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-20 p-3 font-medium">
              <span className="sr-only">{t("foundations.swatch")}</span>
            </th>
            <th scope="col" className="p-3 font-medium">{t("foundations.token")}</th>
            <th scope="col" className="p-3 font-medium">{t("foundations.value")}</th>
            <th scope="col" className="p-3 font-medium">{t("foundations.ratio")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="p-3">{r.swatch}</td>
              <th scope="row" className="p-3 text-left font-mono text-xs font-medium">
                {r.name}
              </th>
              <td className="p-3 font-mono text-xs text-muted-foreground">{r.value}</td>
              <td className="p-3 text-xs">{r.ratio}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TYPE = [
  ["text-display-1", "text-display-1 font-display font-semibold"],
  ["text-display-2", "text-display-2 font-display font-semibold"],
  ["text-display-3", "text-display-3 font-display font-semibold"],
  ["text-board-3", "text-board-3 font-bold"],
  ["font-showcase italic", "font-showcase text-3xl font-bold italic"],
  ["font-sans", "font-sans text-base"],
] as const;

/** "/foundations": the tokens, read live from the current theme. */
export function Foundations() {
  const t = useT(strings);
  const v = useTokenValues();
  const bg = v.background ?? "";
  const minText = useTheme().effective.palette === "malinaw" ? 7 : 4.5;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow={t("app.title")} title={t("foundations.title")} description={t("foundations.lead")} />

      <Block title={t("foundations.colours")} note={t("foundations.colours.note")}>
        <TokenTable
          caption={t("foundations.colours")}
          rows={PAIRS.map(([fill, text]) => ({
            name: `${fill} / ${text}`,
            swatch: (
              <span
                className="grid h-10 w-16 place-items-center rounded-md border font-display text-lg font-semibold"
                style={{ background: `var(--${fill})`, color: `var(--${text})` }}
                aria-hidden="true"
              >
                Aa
              </span>
            ),
            value: `${v[fill] ?? ""} / ${v[text] ?? ""}`,
            ratio: <Ratio value={contrast(v[text] ?? "", v[fill] ?? "")} min={minText} />,
          }))}
        />
      </Block>

      <Block title={t("foundations.charts")}>
        <TokenTable
          caption={t("foundations.charts")}
          rows={MARKS.map((name) => ({
            name,
            swatch: <span aria-hidden="true" className="block h-10 w-16 rounded-md border" style={{ background: `var(--${name})` }} />,
            value: v[name] ?? "",
            ratio: name.startsWith("weave") || name === "border" ? <span className="text-muted-foreground">—</span> : <Ratio value={contrast(v[name] ?? "", bg)} min={3} />,
          }))}
        />
      </Block>

      <Block title={t("foundations.hazard")} note={t("foundations.hazard.note")}>
        <TokenTable
          caption={t("foundations.hazard")}
          rows={HAZARD.map(([fill, text]) => ({
            name: fill,
            swatch: (
              <span aria-hidden="true" className="grid h-10 w-16 place-items-center rounded-md border text-xs font-semibold" style={{ background: `var(--${fill})`, color: `var(--${text})` }}>
                Aa
              </span>
            ),
            value: v[fill] ?? "",
            ratio: <Ratio value={contrast(v[text] ?? "", v[fill] ?? "")} min={4.5} />,
          }))}
        />
      </Block>

      <Block title={t("foundations.type")}>
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card text-card-foreground">
          {TYPE.map(([name, cls]) => (
            <li key={name} className="flex flex-col gap-1 p-4">
              <code className="text-xs text-muted-foreground">{name}</code>
              <span className={`${cls} leading-tight break-words`}>{t("foundations.type.sample")}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t("foundations.surfaces")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["shadow-raised", "shadow-overlay", "shadow-glow"] as const).map((s) => (
            <div key={s} className={`grid h-24 place-items-center rounded-xl border bg-card font-mono text-xs text-card-foreground ${s}`}>
              {s}
            </div>
          ))}
          {(["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl"] as const).map((r) => (
            <div key={r} className={`grid h-16 place-items-center border-2 border-primary bg-card font-mono text-xs text-card-foreground ${r}`}>
              {r}
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground">
            <code className="text-xs">weave-band</code>
            <div aria-hidden="true" className="weave-band rounded" />
          </div>
          <div className="flex h-24 flex-col justify-end rounded-xl border p-3 weave-bg">
            <code className="w-fit rounded bg-card px-1 text-xs text-card-foreground">weave-bg</code>
          </div>
          <div className="flex h-24 flex-col justify-end rounded-xl border p-3 weave-check">
            <code className="w-fit rounded bg-card px-1 text-xs text-card-foreground">weave-check</code>
          </div>
          <div data-surface="showcase" className="grid h-24 place-items-center rounded-xl bg-background font-showcase text-2xl font-bold text-primary italic glow-text">
            glow-text
          </div>
        </div>
      </Block>

      <Block title={t("foundations.motion")} note={t("foundations.motion.note")}>
        <dl className="grid gap-3 rounded-xl border bg-card p-4 text-sm text-card-foreground sm:grid-cols-3">
          {(
            [
              ["DURATION", DURATION],
              ["EASE", EASE],
              ["STAGGER", STAGGER],
            ] as const
          ).map(([name, table]) => (
            <div key={name}>
              <dt className="font-mono text-xs font-semibold">{name}</dt>
              <dd>
                <ul className="mt-1 space-y-0.5 font-mono text-xs text-muted-foreground">
                  {Object.entries(table).map(([k, val]) => (
                    <li key={k}>
                      {k}: {String(val)}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </Block>
    </div>
  );
}
