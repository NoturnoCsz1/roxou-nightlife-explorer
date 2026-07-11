import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes } from "react-router-dom";

import { AdminRoutes } from "@/app/routes/adminRoutes";
import { PartnerRoutes } from "@/app/routes/partnerRoutes";
import { PublicRoutes } from "@/app/routes/publicRoutes";

/**
 * Onda 3 (modularização) — App.tsx passa a ser somente o shell:
 *  - providers globais (QueryClient, Tooltip, Toasters)
 *  - BrowserRouter
 *  - composição das árvores de rotas por produto
 *
 * Cada produto (Admin, Partner, Public+Transport) mantém sua própria
 * árvore em `src/app/routes/*` com imports lazy — o bundle público
 * inicial não puxa mais AdminLayout nem PartnerPreviewLayout.
 *
 * URLs, guards, permissões, parâmetros, slugs, redirects e deep links
 * são preservados 1:1 em relação à versão anterior.
 */
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {AdminRoutes()}
          {PartnerRoutes()}
          {PublicRoutes()}
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
