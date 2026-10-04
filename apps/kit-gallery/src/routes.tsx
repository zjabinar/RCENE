/**
 * Route table. "/frame/…" sits outside the AppShell: it is the page inside the
 * 390 px preview iframe.
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { AppLayout } from "./AppLayout.tsx";
import { FAMILIES } from "./gallery/registry.ts";
import { BlockPage, FamilyPage } from "./pages/Family.tsx";
import { Foundations } from "./pages/Foundations.tsx";
import { Frame } from "./pages/Frame.tsx";
import { Overview } from "./pages/Overview.tsx";
import { Sources } from "./pages/Sources.tsx";
import { Themes } from "./pages/Themes.tsx";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Overview /> },
      { path: "foundations", element: <Foundations /> },
      { path: "themes", element: <Themes /> },
      ...FAMILIES.flatMap((family): RouteObject[] => [
        { path: family, element: <FamilyPage family={family} /> },
        { path: `${family}/:slug`, element: <BlockPage family={family} /> },
      ]),
      { path: "sources", element: <Sources /> },
    ],
  },
  { path: "frame/:family/:slug", element: <Frame />, errorElement: <RouteError /> },
];
