import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App.tsx";
import "./index.css";

// Force immediate update when new SW is available
registerSW({ immediate: true });

const isMidiaSubdomain =
  typeof window !== "undefined" &&
  window.location.hostname.startsWith("midia.");

const root = createRoot(document.getElementById("root")!);

if (isMidiaSubdomain) {
  // midia.roxou.com.br — resolve internamente sem redirect visível.
  // Mantém a URL na barra e monta apenas o site institucional (isolado
  // do bundle público: sem PublicLayout, sem BottomNav, sem AdSense).
  const RoxouMedia = lazy(() => import("@/pages/RoxouMedia"));
  const queryClient = new QueryClient();
  root.render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense fallback={null}>
          <RoxouMedia />
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>,
  );
} else {
  root.render(<App />);
}
