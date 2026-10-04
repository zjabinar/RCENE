/**
 * The website frame for every page: SiteShell (skip link, sticky header with
 * nav, theme and language menus, footer) instead of the app's AppShell, the
 * brand mark, Lenis smooth scrolling, scroll restoration, and the presenter
 * bar for the live demo (press P on any page; it opens by itself with
 * ?present in the address).
 */
import { useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { useT } from "@rcene/i18n";
import { AppMark } from "@rcene/kit/brand";
import { PresenterMode } from "@rcene/kit/poster";
import { SiteFooter, SiteShell } from "@rcene/kit/site";
import { useDemoSteps } from "@/features/demo/demo-steps.ts";
import { strings } from "@/i18n/strings.ts";

export function SiteLayout() {
  const t = useT(strings);
  const steps = useDemoSteps();
  const { search } = useLocation();
  // Hidden until P is pressed, unless the site was opened with ?present.
  const [presenting, setPresenting] = useState(() => new URLSearchParams(search).has("present"));
  const brand = <AppMark size={32} />;

  return (
    <SiteShell
      title={t("app.title")}
      brand={brand}
      strings={strings}
      smooth
      nav={[
        { to: "/", label: t("nav.home") },
        { to: "/story", label: t("nav.story") },
        { to: "/about", label: t("nav.about") },
        { to: "/poster", label: t("nav.poster") },
        { to: "/sources", label: t("app.sources") },
      ]}
      footer={
        <SiteFooter
          brand={
            <>
              {brand}
              <span>{t("app.title")}</span>
            </>
          }
          note={t("footer.note")}
          columns={[
            {
              title: t("footer.explore"),
              links: [
                { to: "/", label: t("nav.home") },
                { to: "/story", label: t("nav.story") },
                { to: "/poster", label: t("nav.poster") },
              ],
            },
            {
              title: t("footer.project"),
              links: [
                { to: "/about", label: t("about.hero.title") },
                { to: "/sources", label: t("app.sources") },
              ],
            },
          ]}
        />
      }
    >
      <Outlet />
      {/* A new page starts at the top (and Back returns to where you were). */}
      <ScrollRestoration />
      <PresenterMode steps={steps} open={presenting} onOpenChange={setPresenting} />
    </SiteShell>
  );
}
