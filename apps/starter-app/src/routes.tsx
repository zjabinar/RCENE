/**
 * Route table. Exported (not rendered here) so a platform (P1–P10) can mount
 * this app's routes under its own layout later. "/" is the role launcher; each
 * role in src/roles.ts owns its first path segment.
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { AppLayout } from "./AppLayout.tsx";
import { Board } from "./pages/Board.tsx";
import { NewRequest } from "./pages/console/NewRequest.tsx";
import { ConsoleOverview } from "./pages/console/Overview.tsx";
import { RecordDetail } from "./pages/console/RecordDetail.tsx";
import { ConsoleRecords } from "./pages/console/Records.tsx";
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
      { path: "sources", element: <Sources /> },
    ],
  },
];
