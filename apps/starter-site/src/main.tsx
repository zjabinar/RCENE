import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { StringsProvider } from "@rcene/i18n";
import { strings } from "./i18n/strings.ts";
import { routes } from "./routes.tsx";
import "./index.css";

const router = createBrowserRouter(routes);

// The provider reaches what renders outside the SiteShell too (RouteError).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StringsProvider value={strings}>
      <RouterProvider router={router} />
    </StringsProvider>
  </StrictMode>,
);
