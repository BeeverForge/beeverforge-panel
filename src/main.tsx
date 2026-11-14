import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/archivo/wdth.css";
import "./styles/base.css";
import "./styles/tokens.css";
import { queryClient } from "./app/queryClient";
import { router } from "./app/router";
import { LiveProvider } from "./live/LiveProvider";
import { ensureVisitor } from "./api/http";
import { AuthGate } from "./app/AuthGate";

ensureVisitor();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthGate>
          <LiveProvider>
            <RouterProvider router={router} />
          </LiveProvider>
        </AuthGate>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
