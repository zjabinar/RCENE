/**
 * Route table. Exported (not rendered here) so a platform (P1–P10) can mount
 * these routes under its own layout later. Every site page sits in the
 * SiteLayout; /presenter is the bare speaker-notes window.
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { SiteLayout } from "./SiteLayout.tsx";
import { About } from "./pages/About.tsx";
import { Home } from "./pages/Home.tsx";
import { Poster } from "./pages/Poster.tsx";
import { Presenter } from "./pages/Presenter.tsx";
import { Sources } from "./pages/Sources.tsx";
import { Story } from "./pages/Story.tsx";

export const routes: RouteObject[] = [
  {
    element: <SiteLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "story", element: <Story /> },
      { path: "about", element: <About /> },
      { path: "poster", element: <Poster /> },
      { path: "sources", element: <Sources /> },
    ],
  },
  { path: "presenter", element: <Presenter />, errorElement: <RouteError /> },
];
