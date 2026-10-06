/**
 * /poster: the A3 competition poster (portrait), six panels: problem, the app in one
 * picture, what is different, how AI built it (and works inside it), data, impact.
 * Print from Chrome or Edge with the toolbar's Print button: Save as PDF, margins None,
 * background graphics on. Re-skin: the copy is poster.* in src/i18n/strings.ts.
 */
import { useT } from "@rcene/i18n";
import { Wordmark } from "@rcene/kit/brand";
import { AiBuiltPanel, PosterFigure, PosterPage, QrToApp, SixPanelPoster, usePosterSheet } from "@rcene/kit/poster";
import { CategoryBars } from "@/features/poster/CategoryBars.tsx";
import { strings } from "@/i18n/strings.ts";
import { useRecords } from "@/store.ts";

function Panels({ appUrl }: { appUrl: string }) {
  const t = useT(strings);
  const records = useRecords((s) => s.records);
  const portrait = usePosterSheet().orientation === "portrait";
  const steps = portrait ? ([1, 2, 3, 4] as const).map((n) => t(`poster.step.${n}`)) : undefined;

  return (
    <SixPanelPoster
      title={t("app.title")}
      subtitle={t("poster.subtitle")}
      qr={<QrToApp url={appUrl} label={t("poster.scan")} size={portrait ? "28mm" : "20mm"} />}
      footer={
        <>
          <span>{t("poster.footer.event")}</span>
          <span className="flex items-center gap-3">
            {t("poster.footer.team")}
            <Wordmark variant="compact" className="text-lg text-foreground" />
          </span>
        </>
      }
      panels={{
        problem: (
          <>
            <p>{t("poster.problem.1")}</p>
            <p>{t("poster.problem.2")}</p>
          </>
        ),
        picture: (
          <PosterFigure title={t("poster.picture.title")} caption={t("poster.picture.caption", { n: records.length })} downloadSvg="requests-by-category">
            <CategoryBars records={records} className="h-auto max-h-[70mm] w-full" />
          </PosterFigure>
        ),
        different: (
          <ul className="flex list-disc flex-col gap-2 ps-6">
            <li>{t("poster.different.1")}</li>
            <li>{t("poster.different.2")}</li>
            <li>{t("poster.different.3")}</li>
          </ul>
        ),
        ai: (
          <AiBuiltPanel
            tools={[
              { name: "Claude Code", role: t("poster.ai.claude") },
              { name: "OpenAI · Claude · Gemini", role: t("poster.ai.runtime") },
              { name: "Playwright", role: t("poster.ai.playwright") },
            ]}
            steps={steps}
            disclosure={t("poster.disclosure")}
          />
        ),
        data: (
          <ul className="flex list-disc flex-col gap-1.5 ps-6">
            <li>{t("poster.data.1")}</li>
            <li>{t("poster.data.2")}</li>
            <li>{t("poster.data.3")}</li>
          </ul>
        ),
        impact: (
          <ul className="flex list-disc flex-col gap-1.5 ps-6">
            <li>{t("poster.impact.1")}</li>
            <li>{t("poster.impact.2")}</li>
            <li>{t("poster.impact.3")}</li>
          </ul>
        ),
      }}
    />
  );
}

export function Poster() {
  const t = useT(strings);
  // The QR code follows the address in the browser bar: open the poster from the laptop's LAN address before printing.
  const appUrl = typeof window === "undefined" ? "/" : `${window.location.origin}/`;
  return (
    <PosterPage title={t("poster.sheet")} size="A3" fit="contain" className="h-[calc(100svh-13rem)] min-h-[40rem]">
      <Panels appUrl={appUrl} />
    </PosterPage>
  );
}
