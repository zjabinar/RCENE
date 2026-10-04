/**
 * About: how AI built the site (the page's one showcase surface, with the
 * disclosure line from docs/DISCLOSURE.md), a QR code to open it on a phone,
 * how to present it, and the credits.
 */
import { Link } from "react-router";
import { CalendarDaysIcon, CodeIcon, DatabaseIcon, MonitorPlayIcon, SmartphoneIcon, TypeIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@rcene/i18n";
import { AppMark, WeavePattern, Wordmark } from "@rcene/kit/brand";
import { AiBuiltPanel, QrToApp } from "@rcene/kit/poster";
import { Hero, Section } from "@rcene/kit/site";
import { Button } from "@rcene/ui/components/button";
import { strings } from "@/i18n/strings.ts";

const NOTES_WINDOW = "popup,width=960,height=720";
const KEYS = ["P", "←", "→", "T", "Esc"] as const;

function BrandPanel() {
  return (
    <div className="relative isolate grid min-h-72 place-items-center overflow-hidden p-8 sm:p-12">
      <WeavePattern name="diamond" opacity={0.24} />
      <div className="relative flex flex-col items-center gap-4 rounded-xl bg-card px-8 py-7 text-card-foreground shadow-raised">
        <AppMark size={72} />
        <Wordmark className="text-4xl sm:text-5xl" />
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border bg-card p-6 text-card-foreground shadow-raised">
      <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-lg bg-highlight text-highlight-foreground [&_svg]:size-5">
        {icon}
      </span>
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      <div className="flex flex-1 flex-col gap-4 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">{children}</div>
    </article>
  );
}

export function About() {
  const t = useT(strings);
  // The QR code follows the address in the browser bar (the laptop's LAN address on the day).
  const siteUrl = typeof window === "undefined" ? "/" : `${window.location.origin}/`;

  return (
    <>
      <Hero eyebrow={t("about.hero.eyebrow")} title={t("about.hero.title")} lead={t("about.hero.lead")} media={<BrandPanel />} />

      <Section id="ai" tone="showcase" eyebrow={t("about.ai.eyebrow")} title={t("about.ai.title")} lead={t("about.ai.lead")}>
        <div className="rounded-2xl border bg-card/60 p-6 text-base text-card-foreground backdrop-blur sm:p-8 sm:text-lg">
          <AiBuiltPanel
            tools={[
              { name: "Claude Code", role: t("about.ai.tool.claude") },
              { name: "Playwright", role: t("about.ai.tool.playwright") },
            ]}
            steps={[
              t("about.ai.step.brief"),
              t("about.ai.step.domain"),
              t("about.ai.step.kit"),
              t("about.ai.step.check"),
              t("about.ai.step.review"),
            ]}
            disclosure={t("about.ai.disclosure")}
          />
        </div>
      </Section>

      <Section id="share" eyebrow={t("about.share.eyebrow")} title={t("about.share.title")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card icon={<SmartphoneIcon />} title={t("about.qr.title")}>
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <QrToApp url={siteUrl} label={t("about.qr.label")} size={168} className="shrink-0" />
              <p>{t("about.qr.body")}</p>
            </div>
          </Card>
          <Card icon={<MonitorPlayIcon />} title={t("about.present.title")}>
            <p>{t("about.present.body")}</p>
            <p aria-hidden="true" className="flex flex-wrap gap-2">
              {KEYS.map((key) => (
                <kbd key={key} className="min-w-9 rounded-md border bg-muted px-2 py-1 text-center font-mono text-sm text-foreground shadow-raised">
                  {key}
                </kbd>
              ))}
            </p>
            <div className="mt-auto">
              <Button type="button" variant="outline" onClick={() => window.open("/presenter", "presenter-notes", NOTES_WINDOW)}>
                <MonitorPlayIcon aria-hidden="true" />
                {t("about.present.notes")}
              </Button>
            </div>
          </Card>
        </div>
      </Section>

      <Section id="credits" tone="muted" eyebrow={t("about.credits.eyebrow")} title={t("about.credits.title")}>
        <ul role="list" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <Card icon={<DatabaseIcon />} title={t("about.credits.data.title")}>
              <p>{t("about.credits.data.body")}</p>
            </Card>
          </li>
          <li>
            <Card icon={<CodeIcon />} title={t("about.credits.code.title")}>
              <p>{t("about.credits.code.body")}</p>
            </Card>
          </li>
          <li>
            <Card icon={<TypeIcon />} title={t("about.credits.type.title")}>
              <p>{t("about.credits.type.body")}</p>
            </Card>
          </li>
          <li>
            <Card icon={<CalendarDaysIcon />} title={t("about.credits.event.title")}>
              <p>{t("about.credits.event.body")}</p>
            </Card>
          </li>
        </ul>
        <div className="mt-8">
          <Button variant="outline" asChild>
            <Link to="/sources">
              <DatabaseIcon aria-hidden="true" />
              {t("about.credits.sources")}
            </Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
