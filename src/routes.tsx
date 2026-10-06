/**
 * Route table. Exported (not rendered here) so it can be mounted elsewhere later.
 * "/" is the role launcher; each role has its own route (replace the RolePage
 * placeholders with the real views, and add sub-routes like "center/:id" next to them).
 * /presenter (the speaker notes) sits outside the shell.
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { AppLayout } from "./AppLayout.tsx";
import { AdminAi } from "./pages/admin/AdminAi.tsx";
import { AdminAppearance } from "./pages/admin/AdminAppearance.tsx";
import { AdminData } from "./pages/admin/AdminData.tsx";
import { AdminHome } from "./pages/admin/AdminHome.tsx";
import { AdminLab } from "./pages/admin/AdminLab.tsx";
import { Demo } from "./pages/Demo.tsx";
import { Poster } from "./pages/Poster.tsx";
import { Presenter } from "./pages/Presenter.tsx";
import { RolePage } from "./pages/RolePage.tsx";
import { Sources } from "./pages/Sources.tsx";
import { Start } from "./pages/Start.tsx";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Start /> },
      { path: "console", element: <RolePage role="console" /> },
      { path: "resident", element: <RolePage role="resident" /> },
      { path: "center", element: <RolePage role="center" /> },
      { path: "board", element: <RolePage role="board" /> },
      {
        path: "admin",
        children: [
          { index: true, element: <AdminHome /> },
          { path: "ai", element: <AdminAi /> },
          { path: "lab", element: <AdminLab /> },
          { path: "appearance", element: <AdminAppearance /> },
          { path: "data", element: <AdminData /> },
        ],
      },
      { path: "demo", element: <Demo /> },
      { path: "poster", element: <Poster /> },
      { path: "sources", element: <Sources /> },
    ],
  },
  { path: "presenter", element: <Presenter />, errorElement: <RouteError /> },
];
