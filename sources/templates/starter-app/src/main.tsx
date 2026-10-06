import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { StringsProvider } from "@rcene/i18n";
import { strings } from "./i18n/strings.ts";
import { routes } from "./routes.tsx";
import "./index.css";

const router = createBrowserRouter(routes);

// StringsProvider: the route error page renders outside AppShell and still gets the app's strings.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StringsProvider value={strings}>
      <RouterProvider router={router} />
    </StringsProvider>
  </StrictMode>,
);
