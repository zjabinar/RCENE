import { useT } from "@rcene/i18n";
import { Surface } from "@rcene/kit";
import { AppMark, Wordmark } from "@rcene/kit/brand";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "AppMark · Wordmark",
  summary: {
    en: "The woven pin before every app title (AppShell brand), and the RCENE wordmark for posters, about pages and title slides.",
    war: "An hinabol nga pin una han titulo han kada app (AppShell brand), ngan an RCENE wordmark para ha poster, about page ngan title slide.",
    fil: "Ang hinabing pin bago ang pamagat ng bawat app (AppShell brand), at ang RCENE wordmark para sa poster, about page at title slide.",
  },
  blocks: ["AppMark", "Wordmark"],
  order: 10,
  frameHeight: 820,
};

const strings = {
  en: {
    header: "In the app header",
    title: "Pila",
    tagline: "Barangay hall queue · BRGY-05",
    now: "Now serving",
    sizes: "Sizes",
    small: "Bold 3 × 3 weave below 28 px",
    full: "Full weave with the sea from 28 px",
    wordmark: "Wordmark",
    showcase: "On a showcase surface",
    logo: "Pila home",
  },
  war: {
    header: "Ha header han app",
    tagline: "Pila ha barangay hall · BRGY-05",
    now: "Ginsisilbihan yana",
    sizes: "Mga kadako",
    small: "Mabaskog nga 3 × 3 nga habol ubos han 28 px",
    full: "Bug-os nga habol upod an dagat tikang 28 px",
    showcase: "Ha showcase nga surface",
  },
  fil: {
    header: "Sa header ng app",
    tagline: "Pila sa barangay hall · BRGY-05",
    now: "Pinaglilingkuran ngayon",
    sizes: "Mga laki",
    small: "Makapal na 3 × 3 na habi sa ilalim ng 28 px",
    full: "Buong habi kasama ang dagat mula 28 px",
    showcase: "Sa showcase na surface",
  },
};

const SIZES = [16, 24, 32, 40, 64, 96] as const;

function Label({ children }: { children: string }) {
  return <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>;
}

export function Example() {
  const t = useT(strings);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <Label>{t("header")}</Label>
        {/* In an app: <AppShell title={t("app.title")} brand={<AppMark />} …> */}
        <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-raised">
          <AppMark />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-tight font-semibold tracking-tight sm:text-lg">{t("title")}</p>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{t("tagline")}</p>
          </div>
          <p className="hidden rounded-full bg-highlight px-3 py-1 text-sm font-medium text-highlight-foreground sm:block">
            {t("now")} · Q-014
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Label>{t("sizes")}</Label>
        <ul className="flex flex-wrap items-end gap-x-3 gap-y-4 sm:gap-x-6">
          {SIZES.map((size) => (
            <li key={size} className="flex flex-col items-center gap-2">
              <AppMark size={size} label={size === 96 ? t("logo") : undefined} />
              <span className="font-mono text-xs text-muted-foreground">{size}px</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {t("small")} · {t("full")}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <Label>{t("wordmark")}</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <figure className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-card-foreground">
            <Wordmark className="text-4xl" />
            <figcaption className="font-mono text-xs text-muted-foreground">{'<Wordmark />'}</figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-card-foreground">
            <Wordmark variant="compact" className="text-3xl" />
            <figcaption className="font-mono text-xs text-muted-foreground">{'<Wordmark variant="compact" />'}</figcaption>
          </figure>
        </div>
        <Surface variant="showcase" className="flex flex-wrap items-center justify-between gap-6 rounded-xl p-6">
          <Wordmark className="glow-text text-4xl" />
          <div className="flex items-center gap-3">
            <AppMark size={56} />
            <p className="text-sm text-muted-foreground">{t("showcase")}</p>
          </div>
        </Surface>
      </section>
    </div>
  );
}
