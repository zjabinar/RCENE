/**
 * Route table. Exported (not rendered here) so a platform can mount this app's routes
 * under its own layout later. "/" is the role launcher; each role in src/roles.ts owns
 * its first path segment. /presenter (the speaker notes) sits outside the shell.
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { AppLayout } from "./AppLayout.tsx";
import { AdminAi } from "./pages/admin/AdminAi.tsx";
import { AdminAppearance } from "./pages/admin/AdminAppearance.tsx";
import { AdminData } from "./pages/admin/AdminData.tsx";
import { AdminHome } from "./pages/admin/AdminHome.tsx";
import { AdminLab } from "./pages/admin/AdminLab.tsx";
import { Board } from "./pages/Board.tsx";
import { NewRequest } from "./pages/console/NewRequest.tsx";
import { ConsoleOverview } from "./pages/console/Overview.tsx";
import { RecordDetail } from "./pages/console/RecordDetail.tsx";
import { ConsoleRecords } from "./pages/console/Records.tsx";
import { Demo } from "./pages/Demo.tsx";
import { Poster } from "./pages/Poster.tsx";
import { Presenter } from "./pages/Presenter.tsx";
import { Resident } from "./pages/Resident.tsx";
import { Sources } from "./pages/Sources.tsx";
import { Start } from "./pages/Start.tsx";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Start /> },
      {
        path: "console",
        children: [
          { index: true, element: <ConsoleOverview /> },
          { path: "new", element: <NewRequest /> },
          { path: "records", element: <ConsoleRecords /> },
          { path: ":id", element: <RecordDetail /> },
        ],
      },
      { path: "resident", element: <Resident /> },
      { path: "board", element: <Board /> },
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
