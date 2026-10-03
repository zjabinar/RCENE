/**
 * Route table. Exported (not rendered here) so it can be mounted elsewhere later.
 * "/" is the role launcher; each role has its own route (replace the RolePage
 * placeholders with the real views, and add sub-routes like "center/:id" next to them).
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { AppLayout } from "./AppLayout.tsx";
import { RolePage } from "./pages/RolePage.tsx";
import { Sources } from "./pages/Sources.tsx";
import { Start } from "./pages/Start.tsx";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Start /> },
      { path: "captain", element: <RolePage role="captain" /> },
      { path: "resident", element: <RolePage role="resident" /> },
      { path: "sources", element: <Sources /> },
    ],
  },
];
