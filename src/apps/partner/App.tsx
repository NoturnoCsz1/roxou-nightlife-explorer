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

import "./styles/partner-ui.css";
import PartnerStandaloneLayout from "./layouts/PartnerStandaloneLayout";
import PartnerLoginPage from "./pages/PartnerLoginPage";

const PartnerOnboardingPage = lazy(() => import("./pages/PartnerOnboardingPage"));
const PartnerPendingApprovalPage = lazy(
  () => import("./pages/PartnerPendingApprovalPage"),
);
const PartnerRequestSuccessPage = lazy(
  () => import("./pages/PartnerRequestSuccessPage"),
);
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
const PartnerVipCheckinPage = lazy(() => import("./pages/PartnerVipCheckinPage"));
const PartnerValidatorPage = lazy(() => import("./pages/PartnerValidatorPage"));
const PublicReservation = lazy(() => import("@/pages/PublicReservation"));
const PublicReservationSuccess = lazy(() => import("@/pages/PublicReservationSuccess"));
const PublicVipList = lazy(() => import("@/pages/PublicVipList"));
const PublicVipListSuccess = lazy(() => import("@/pages/PublicVipListSuccess"));


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
          {/* Rotas sem layout/gate */}
          <Route path="/login" element={<PartnerLoginPage />} />
          <Route path="/onboarding" element={L(<PartnerOnboardingPage />)} />
          <Route path="/pending" element={L(<PartnerPendingApprovalPage />)} />
          <Route
            path="/solicitacao-enviada"
            element={L(<PartnerRequestSuccessPage />)}
          />


          <Route path="/" element={<PartnerStandaloneLayout />}>
            <Route index element={L(<PartnerHomePage />)} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="inicio" element={<Navigate to="/" replace />} />
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
            <Route path="fila" element={L(<PartnerFilaPage />)} />
            <Route path="relatorios" element={L(<PartnerRelatoriosPage />)} />
            <Route path="lista-vip" element={L(<PartnerVipListPage />)} />
            <Route
              path="lista-vip/:listId"
              element={L(<PartnerVipListDetailRoute />)}
            />
            <Route path="analytics" element={L(<PartnerAnalyticsPage />)} />
            <Route path="validator" element={L(<PartnerValidatorPage />)} />
            <Route path="configuracoes" element={L(<PartnerConfiguracoesPage />)} />
            <Route path="configuracoes/avancado" element={L(<PartnerSettingsPage />)} />
            <Route path="checkin/:publicToken" element={L(<PartnerVipCheckinPage />)} />
          </Route>


          {/* Rotas públicas (sub-domínio parceiro também responde) */}
          <Route path="/:partnerSlug/reservas" element={L(<PublicReservation />)} />
          <Route path="/reserva/sucesso/:publicToken" element={L(<PublicReservationSuccess />)} />
          <Route path="/:partnerSlug/vip" element={L(<PublicVipList />)} />
          <Route path="/:partnerSlug/vip/sucesso/:publicToken" element={L(<PublicVipListSuccess />)} />
          <Route path="/vip/:listSlug" element={L(<PublicVipList />)} />
          <Route path="/vip/:listSlug/sucesso/:publicToken" element={L(<PublicVipListSuccess />)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default PartnerApp;
