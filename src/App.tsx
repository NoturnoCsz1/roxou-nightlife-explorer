import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

/** Redireciona /v3/* (rotas legadas) para o caminho equivalente na raiz. */
function RedirectV3() {
  const { pathname, search, hash } = useLocation();
  const target = pathname.replace(/^\/v3/, "") || "/";
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

import Maintenance from "./pages/Maintenance";
import AdminMaintenanceGate from "./components/AdminMaintenanceGate";
import LegacyArchiveLayout from "./components/LegacyArchiveLayout";

import Expo2026 from "./pages/Expo2026";
import Expo2026Contato from "./pages/Expo2026Contato";
import ExpoNoticia from "./pages/ExpoNoticia";
import ExpoShows from "./pages/expo/ExpoShows";
import ExpoProgramacao from "./pages/expo/ExpoProgramacao";
import ExpoIngressos from "./pages/expo/ExpoIngressos";

// Admin
import AdminLayout from "./components/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import ParceirosList from "./pages/admin/ParceirosList";
import ParceiroForm from "./pages/admin/ParceiroForm";
import EventosList from "./pages/admin/EventosList";
import EventoForm from "./pages/admin/EventoForm";
import EventoBulkForm from "./pages/admin/EventoBulkForm";
import Sugestoes from "./pages/admin/Sugestoes";
import EventouAdmin from "./pages/admin/EventouAdmin";
import InstagramAdminPage from "./pages/admin/InstagramAdmin";
import Editores from "./pages/admin/Editores";
import NoticiasList from "./pages/admin/NoticiasList";
import NoticiaForm from "./pages/admin/NoticiaForm";

// V3 (padrão)
import V3Layout from "./components/v3/V3Layout";
import V3Auth from "./pages/v3/V3Auth";
import V3Parceiros from "./pages/v3/V3Parceiros";
import V3Home from "./pages/v3/V3Home";
import V3Discover from "./pages/v3/V3Discover";
import V3Agenda from "./pages/v3/V3Agenda";
import V3Profile from "./pages/v3/V3Profile";
import V3ProfileEdit from "./pages/v3/V3ProfileEdit";
import V3EventDetail from "./pages/v3/V3EventDetail";
import V3LocalDetail from "./pages/v3/V3LocalDetail";
import V3Transport from "./pages/v3/V3Transport";
import V3RideRequest from "./pages/v3/V3RideRequest";
import V3DriverBoard from "./pages/v3/V3DriverBoard";
import V3Chat from "./pages/v3/V3Chat";
import V3MyRides from "./pages/v3/V3MyRides";
import V3Terms from "./pages/v3/V3Terms";
import V3Privacy from "./pages/v3/V3Privacy";
import V3TermsAcceptance from "./pages/v3/V3TermsAcceptance";
import V3Economize from "./pages/v3/V3Economize";
import V3AIChat from "./pages/v3/V3AIChat";
import V3Sobre from "./pages/v3/V3Sobre";
import V3Contato from "./pages/v3/V3Contato";

// Legacy v2 (arquivado em /archive/legacy-v2/*)
import LegacyIndex from "./pages/Index";
import LegacyEventDetail from "./pages/EventDetail";
import LegacyHoje from "./pages/Hoje";
import LegacySemana from "./pages/Semana";
import LegacyCategorias from "./pages/Categorias";
import LegacySalvos from "./pages/Salvos";
import LegacyIndica from "./pages/Indica";
import LegacyLocalDetail from "./pages/LocalDetail";
import LegacyLocalEventos from "./pages/LocalEventos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ========= ADMIN (central única de comando) ========= */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="parceiros" element={<ParceirosList />} />
            <Route path="parceiros/novo" element={<ParceiroForm />} />
            <Route path="parceiros/:id/editar" element={<ParceiroForm />} />
            <Route path="eventos" element={<EventosList />} />
            <Route path="eventos/novo" element={<EventoForm />} />
            <Route path="eventos/novo/lote" element={<EventoBulkForm />} />
            <Route path="eventos/:id/editar" element={<EventoForm />} />
            <Route path="sugestoes" element={<Sugestoes />} />
            <Route path="eventou" element={<EventouAdmin />} />
            <Route path="instagram" element={<InstagramAdminPage />} />
            <Route path="editores" element={<Editores />} />
            <Route path="noticias" element={<NoticiasList />} />
            <Route path="noticias/novo" element={<NoticiaForm />} />
            <Route path="noticias/:id/editar" element={<NoticiaForm />} />
          </Route>

          {/* ========= AUTH ========= */}
          <Route path="/auth" element={<V3Auth />} />
          <Route path="/auth/*" element={<V3Auth />} />

          {/* ========= HOT SITE EXPO 2026 ========= */}
          <Route path="/expo2026" element={<Expo2026 />} />
          <Route path="/expo2026/contato" element={<Expo2026Contato />} />
          <Route path="/expo2026/shows" element={<ExpoShows />} />
          <Route path="/expo2026/programacao" element={<ExpoProgramacao />} />
          <Route path="/expo2026/ingressos" element={<ExpoIngressos />} />
          <Route path="/expo2026/noticia/:slug" element={<ExpoNoticia />} />

          {/* ========= ROXOU V3 (raiz pública) ========= */}
          <Route path="/manutencao" element={<Maintenance />} />
          <Route path="/parceiros" element={<V3Parceiros />} />

          {/* Redirects 301 (permanentes) das URLs antigas /v3/* para a raiz */}
          <Route path="/v3" element={<Navigate to="/" replace />} />
          <Route path="/v3/*" element={<RedirectV3 />} />

          <Route path="/" element={<V3Layout />}>
            <Route index element={<V3Home />} />
            <Route path="descobrir" element={<V3Discover />} />
            <Route path="agenda" element={<V3Agenda />} />
            <Route path="perfil" element={<V3Profile />} />
            <Route path="perfil/editar" element={<V3ProfileEdit />} />
            <Route path="evento/:slug" element={<V3EventDetail />} />
            <Route path="local/:slug" element={<V3LocalDetail />} />
            <Route path="transporte" element={<V3Transport />} />
            <Route path="pedir-carona" element={<V3RideRequest />} />
            <Route path="motorista" element={<V3DriverBoard />} />
            <Route path="chat/:requestId" element={<V3Chat />} />
            <Route path="meus-pedidos" element={<V3MyRides />} />
            <Route path="terms" element={<V3Terms />} />
            <Route path="privacy" element={<V3Privacy />} />
            <Route path="terms-acceptance" element={<V3TermsAcceptance />} />
            <Route path="economize" element={<V3Economize />} />
            <Route path="ia" element={<V3AIChat />} />
            <Route path="sobre" element={<V3Sobre />} />
            <Route path="contato" element={<V3Contato />} />
            <Route path="auth" element={<V3Auth />} />
          </Route>

          {/* ========= LEGACY V2 (arquivado, NoIndex) ========= */}
          <Route path="/archive/legacy-v2" element={<LegacyArchiveLayout />}>
            <Route index element={<LegacyIndex />} />
            <Route path="evento/:slug" element={<LegacyEventDetail />} />
            <Route path="hoje" element={<LegacyHoje />} />
            <Route path="semana" element={<LegacySemana />} />
            <Route path="categorias" element={<LegacyCategorias />} />
            <Route path="salvos" element={<LegacySalvos />} />
            <Route path="indica" element={<LegacyIndica />} />
            <Route path="local/:slug" element={<LegacyLocalDetail />} />
            <Route path="local/:slug/eventos" element={<LegacyLocalEventos />} />
          </Route>

          {/* Catch-all: admins logados acessam app completo (testes V3);
              público vai para a landing V3 (Maintenance / contagem). */}
          <Route path="*" element={<AdminMaintenanceGate />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
