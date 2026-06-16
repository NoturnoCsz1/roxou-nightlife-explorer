/**
 * Partner Pro App — router standalone (Fase 9M).
 *
 * Roda em parceiro.roxou.com.br. Reutiliza páginas, layout, hooks e
 * serviços já criados nas Fases 9A–9K. Gate de acesso continua sendo
 * `usePartnerBetaAccess` (admin Roxou + partner_beta_access ativo).
 *
 * Não cria cadastro paralelo. Não altera a Roxou pública, o Admin atual,
 * RLS, edge functions, banco nem o PWA principal.
 */
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import PartnerStandaloneLayout from "./layouts/PartnerStandaloneLayout";
import PartnerLoginPage from "./pages/PartnerLoginPage";

const PartnerBetaLandingPage = lazy(() => import("./pages/PartnerBetaLandingPage"));
const PartnerDashboardPage = lazy(() => import("./pages/PartnerDashboardPage"));
const PartnerProfilePage = lazy(() => import("./pages/PartnerProfilePage"));
const PartnerEventsPage = lazy(() => import("./pages/PartnerEventsPage"));
const PartnerEventNewRoute = lazy(() =>
  import("./routes/PartnerEventRoutes").then((m) => ({ default: m.PartnerEventNewRoute })),
);
const PartnerEventDetailRoute = lazy(() =>
  import("./routes/PartnerEventRoutes").then((m) => ({ default: m.PartnerEventDetailRoute })),
);
const PartnerEventEditRoute = lazy(() =>
  import("./routes/PartnerEventRoutes").then((m) => ({ default: m.PartnerEventEditRoute })),
);
const PartnerReservationsPage = lazy(() => import("./pages/PartnerReservationsPage"));
const PartnerReservationDetailPage = lazy(
  () => import("./pages/PartnerReservationDetailPage"),
);
const PartnerVipListPage = lazy(() => import("./pages/PartnerVipListPage"));
const PartnerVipListDetailRoute = lazy(
  () => import("./routes/PartnerVipListDetailRoute"),
);
const PartnerAnalyticsPage = lazy(() => import("./pages/PartnerAnalyticsPage"));
const PartnerSettingsPage = lazy(() => import("./pages/PartnerSettingsPage"));

const Fallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
  </div>
);
const L = (el: React.ReactNode) => <Suspense fallback={<Fallback />}>{el}</Suspense>;

const queryClient = new QueryClient();

const PartnerApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Login fica fora do layout (sem provider/gate). */}
          <Route path="/login" element={<PartnerLoginPage />} />

          <Route path="/" element={<PartnerStandaloneLayout />}>
            <Route index element={L(<PartnerBetaLandingPage />)} />
            <Route path="dashboard" element={L(<PartnerDashboardPage />)} />
            <Route path="perfil" element={L(<PartnerProfilePage />)} />
            <Route path="eventos" element={L(<PartnerEventsPage />)} />
            <Route path="eventos/novo" element={L(<PartnerEventNewRoute />)} />
            <Route path="eventos/:eventId" element={L(<PartnerEventDetailRoute />)} />
            <Route path="eventos/:eventId/editar" element={L(<PartnerEventEditRoute />)} />
            <Route path="reservas" element={L(<PartnerReservationsPage />)} />
            <Route
              path="reservas/:reservationId"
              element={L(<PartnerReservationDetailPage />)}
            />
            <Route path="lista-vip" element={L(<PartnerVipListPage />)} />
            <Route
              path="lista-vip/:listId"
              element={L(<PartnerVipListDetailRoute />)}
            />
            <Route path="analytics" element={L(<PartnerAnalyticsPage />)} />
            <Route path="configuracoes" element={L(<PartnerSettingsPage />)} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default PartnerApp;
