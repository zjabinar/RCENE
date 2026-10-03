/**
 * Route table. Exported (not rendered here) so a platform (P1–P10) can mount
 * this app's routes under its own layout later.
 */
import type { RouteObject } from "react-router";
import { RouteError } from "@rcene/ui";
import { AppLayout } from "./AppLayout.tsx";
import { Home } from "./pages/Home.tsx";
import { Sources } from "./pages/Sources.tsx";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "sources", element: <Sources /> },
    ],
  },
];
