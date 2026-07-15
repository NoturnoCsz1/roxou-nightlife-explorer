import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { L } from "./lazyFallback";

/**
 * Árvore de rotas do Admin (Onda 3 — isolamento por produto).
 *
 * IMPORTANTE:
 *  - AdminLayout agora é lazy (era import estático em App.tsx).
 *    Isso remove o chunk do bundle público inicial.
 *  - URLs preservadas 1:1.
 *  - Guards, permissões e outlets inalterados.
 *
 * Não inclui `/admin/partner-preview/*` — essa árvore vive em
 * `partnerRoutes` porque usa o PartnerPreviewLayout (produto Partner).
 */
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));

const AdminLogin = lazy(() => import("@/apps/admin/pages/AdminLogin"));
const Dashboard = lazy(() => import("@/apps/admin/pages/Dashboard"));
const ParceirosList = lazy(() => import("@/apps/admin/pages/ParceirosList"));
const ParceiroForm = lazy(() => import("@/apps/admin/pages/ParceiroForm"));
const EstabelecimentosAudit = lazy(
  () => import("@/apps/admin/pages/EstabelecimentosAudit"),
);
const EventosList = lazy(() => import("@/apps/admin/pages/EventosList"));
const EventoForm = lazy(() => import("@/apps/admin/pages/EventoForm"));
const EventoBulkForm = lazy(() => import("@/apps/admin/pages/EventoBulkForm"));
const Sugestoes = lazy(() => import("@/apps/admin/pages/Sugestoes"));
const EventouAdmin = lazy(() => import("@/apps/admin/pages/EventouAdmin"));
const InstagramAdminPage = lazy(
  () => import("@/apps/admin/pages/InstagramAdmin"),
);
const RadarIA = lazy(() => import("@/apps/admin/pages/RadarIA"));
const AutoReels = lazy(() => import("@/apps/admin/pages/AutoReels"));
const AdminSecurity = lazy(() => import("@/apps/admin/pages/AdminSecurity"));
const AuraCommand = lazy(() => import("@/apps/admin/pages/AuraCommand"));
const JogosAdmin = lazy(() => import("@/apps/admin/pages/JogosAdmin"));
const Editores = lazy(() => import("@/apps/admin/pages/Editores"));
const CrmHub = lazy(() => import("@/apps/admin/pages/CrmHub"));
const CrmCustomerDetail = lazy(
  () => import("@/apps/admin/pages/CrmCustomerDetail"),
);
const CrmSyncPage = lazy(() => import("@/apps/admin/pages/CrmSyncPage"));
const NoticiasList = lazy(() => import("@/apps/admin/pages/NoticiasList"));
const NoticiaForm = lazy(() => import("@/apps/admin/pages/NoticiaForm"));
const Premiacoes = lazy(() => import("@/apps/admin/pages/Premiacoes"));
const Artes = lazy(() => import("@/apps/admin/pages/Artes"));
const StoryAgendaDoDia = lazy(
  () => import("@/apps/admin/pages/StoryAgendaDoDia"),
);
const PartnerAccessRequests = lazy(
  () => import("@/apps/admin/pages/PartnerAccessRequests"),
);
const PartnerPilot = lazy(() => import("@/apps/admin/pages/PartnerPilot"));
const AdminSystem = lazy(() => import("@/apps/admin/pages/AdminSystem"));
const AdminLogs = lazy(() => import("@/apps/admin/pages/AdminLogs"));
const Expo2026Admin = lazy(() => import("@/apps/admin/pages/Expo2026Admin"));
const Expo2026CamarotesAdmin = lazy(
  () => import("@/apps/admin/pages/Expo2026CamarotesAdmin"),
);
const AdminBiosPage = lazy(() => import("@/pages/admin/AdminBiosPage"));
const AdminDiscovery = lazy(() => import("@/apps/admin/pages/AdminDiscovery"));

export const AdminRoutes = () => (
  <>
    <Route
      path="/admin/login"
      element={<Navigate to="/admin/central" replace />}
    />
    <Route path="/admin/central" element={L(<AdminLogin />)} />
    <Route path="/admin" element={L(<AdminLayout />)}>
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={L(<Dashboard />)} />
      <Route path="parceiros" element={L(<ParceirosList />)} />
      <Route path="parceiros/novo" element={L(<ParceiroForm />)} />
      <Route path="parceiros/:id/editar" element={L(<ParceiroForm />)} />
      <Route path="estabelecimentos" element={L(<EstabelecimentosAudit />)} />
      <Route path="eventos" element={L(<EventosList />)} />
      <Route path="eventos/novo" element={L(<EventoForm />)} />
      <Route path="eventos/novo/lote" element={L(<EventoBulkForm />)} />
      <Route path="eventos/:id/editar" element={L(<EventoForm />)} />
      <Route path="sugestoes" element={L(<Sugestoes />)} />
      <Route path="eventou" element={L(<EventouAdmin />)} />
      <Route path="instagram" element={L(<InstagramAdminPage />)} />
      <Route path="radar-ia" element={L(<RadarIA />)} />
      <Route path="autoreels" element={L(<AutoReels />)} />
      <Route path="security" element={L(<AdminSecurity />)} />
      <Route path="aura" element={L(<AuraCommand />)} />
      <Route path="jogos" element={L(<JogosAdmin />)} />
      <Route path="editores" element={L(<Editores />)} />
      <Route path="noticias" element={L(<NoticiasList />)} />
      <Route path="noticias/novo" element={L(<NoticiaForm />)} />
      <Route path="noticias/:id/editar" element={L(<NoticiaForm />)} />
      <Route path="premiacoes" element={L(<Premiacoes />)} />
      <Route path="artes" element={L(<Artes />)} />
      <Route path="story-agenda" element={L(<StoryAgendaDoDia />)} />
      <Route path="partner-requests" element={L(<PartnerAccessRequests />)} />
      <Route path="partner-pilot" element={L(<PartnerPilot />)} />
      <Route path="system" element={L(<AdminSystem />)} />
      <Route path="logs" element={L(<AdminLogs />)} />
      <Route path="expo2026" element={L(<Expo2026Admin />)} />
      <Route path="expo2026/camarotes" element={L(<Expo2026CamarotesAdmin />)} />
      <Route path="crm" element={L(<CrmHub />)} />
      <Route path="crm/sync" element={L(<CrmSyncPage />)} />
      <Route path="crm/:id" element={L(<CrmCustomerDetail />)} />
      <Route path="bios" element={L(<AdminBiosPage />)} />
      <Route path="descobertas" element={L(<AdminDiscovery />)} />
    </Route>
  </>
);
