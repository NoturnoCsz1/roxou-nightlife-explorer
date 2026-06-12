import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

/** Fallback leve para rotas lazy. */
const LazyFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
  </div>
);
const L = (el: React.ReactNode) => <Suspense fallback={<LazyFallback />}>{el}</Suspense>;

/** Redireciona /v3/* (rotas legadas) para o caminho equivalente na raiz. */
function RedirectV3() {
  const { pathname, search, hash } = useLocation();
  const target = pathname.replace(/^\/v3/, "") || "/";
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

import Maintenance from "./pages/Maintenance";
import AdminMaintenanceGate from "./components/AdminMaintenanceGate";
import LegacyArchiveLayout from "./components/LegacyArchiveLayout";

// Notícias (lazy — rotas raras)
const Contato = lazy(() => import("./pages/Contato"));
const RoxouNoticias = lazy(() => import("./pages/RoxouNoticias"));
const RoxouNoticia = lazy(() => import("./pages/RoxouNoticia"));

// Admin (lazy — rotas privadas/raras)
import AdminLayout from "./components/admin/AdminLayout";
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ParceirosList = lazy(() => import("./pages/admin/ParceirosList"));
const ParceiroForm = lazy(() => import("./pages/admin/ParceiroForm"));
const EstabelecimentosAudit = lazy(() => import("./pages/admin/EstabelecimentosAudit"));
const EventosList = lazy(() => import("./pages/admin/EventosList"));
const EventoForm = lazy(() => import("./pages/admin/EventoForm"));
const EventoBulkForm = lazy(() => import("./pages/admin/EventoBulkForm"));
const Sugestoes = lazy(() => import("./pages/admin/Sugestoes"));
const EventouAdmin = lazy(() => import("./pages/admin/EventouAdmin"));
const InstagramAdminPage = lazy(() => import("./pages/admin/InstagramAdmin"));
const RadarIA = lazy(() => import("./pages/admin/RadarIA"));
const AutoReels = lazy(() => import("./pages/admin/AutoReels"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));
const AuraCommand = lazy(() => import("./pages/admin/AuraCommand"));
const JogosAdmin = lazy(() => import("./pages/admin/JogosAdmin"));
const SegurancaRevisao = lazy(() => import("./pages/SegurancaRevisao"));
const Editores = lazy(() => import("./pages/admin/Editores"));
const NoticiasList = lazy(() => import("./pages/admin/NoticiasList"));
const NoticiaForm = lazy(() => import("./pages/admin/NoticiaForm"));
const Premiacoes = lazy(() => import("./pages/admin/Premiacoes"));
const Artes = lazy(() => import("./pages/admin/Artes"));
const BarDoMes = lazy(() => import("./pages/BarDoMes"));

// V3 (padrão)
import V3Layout from "./components/v3/V3Layout";
import V3Auth from "./pages/v3/V3Auth";
import V3Parceiros from "./pages/v3/V3Parceiros";
import V3Rankings from "./pages/v3/V3Rankings";
import V3Community from "./pages/v3/V3Community";
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
const PertoDeMim = lazy(() => import("./pages/PertoDeMim"));
const Jogos = lazy(() => import("./pages/Jogos"));
const JogoDetail = lazy(() => import("./pages/JogoDetail"));
const TabelaCampeonato = lazy(() => import("./pages/TabelaCampeonato"));
const Resultados = lazy(() => import("./pages/Resultados"));
const RemoverDados = lazy(() => import("./pages/RemoverDados"));
const CadastroMotorista = lazy(() => import("./pages/CadastroMotorista"));
const SEOLanding = lazy(() => import("./pages/SEOLanding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CopaDoMundo2026 = lazy(() => import("./pages/CopaDoMundo2026"));
import PedirCaronaGate from "./components/PedirCaronaGate";

// Legacy v2 (arquivado em /archive/legacy-v2/*) — lazy
const LegacyIndex = lazy(() => import("./pages/Index"));
const LegacyEventDetail = lazy(() => import("./pages/EventDetail"));
const LegacyHoje = lazy(() => import("./pages/Hoje"));
const LegacySemana = lazy(() => import("./pages/Semana"));
const LegacyCategorias = lazy(() => import("./pages/Categorias"));
const LegacySalvos = lazy(() => import("./pages/Salvos"));
const LegacyIndica = lazy(() => import("./pages/Indica"));
const LegacyLocalDetail = lazy(() => import("./pages/LocalDetail"));
const LegacyLocalEventos = lazy(() => import("./pages/LocalEventos"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ========= ADMIN (central única de comando) ========= */}
          <Route path="/admin/login" element={<Navigate to="/admin/central" replace />} />
          <Route path="/admin/central" element={L(<AdminLogin />)} />
          <Route path="/admin" element={<AdminLayout />}>
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
          </Route>

          {/* ========= AUTH ========= */}
          <Route path="/auth" element={<V3Auth />} />
          <Route path="/auth/*" element={<V3Auth />} />
          <Route path="/seguranca/revisao" element={L(<SegurancaRevisao />)} />

          {/* ========= CONTATO ========= */}
          <Route path="/contato" element={L(<Contato />)} />

          {/* ========= EXPO 2026 — DESATIVADA (redireciona para Home) ========= */}
          <Route path="/expo2026" element={<Navigate to="/" replace />} />
          <Route path="/expo2026/*" element={<Navigate to="/" replace />} />
          <Route path="/expoprudente" element={<Navigate to="/" replace />} />
          <Route path="/expoprudente/*" element={<Navigate to="/" replace />} />

          {/* ========= NOTÍCIAS ROXOU ========= */}
          <Route path="/noticias" element={L(<RoxouNoticias />)} />
          <Route path="/noticia/:slug" element={L(<RoxouNoticia />)} />

          {/* ========= ROXOU V3 (raiz pública) ========= */}
          <Route path="/manutencao" element={<Maintenance />} />
          <Route path="/remover-dados" element={L(<RemoverDados />)} />
          <Route path="/cadastro-motorista" element={L(<CadastroMotorista />)} />
          {/* /pedir-carona só funciona vinculado a evento (eventId/eventSlug); sem evento → /agenda */}
          <Route path="/pedir-carona" element={<PedirCaronaGate />} />
          <Route path="/parceiros" element={<V3Parceiros />} />
          <Route path="/resultados" element={L(<Resultados />)} />
          <Route path="/tabela/:slug" element={L(<TabelaCampeonato />)} />

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
            {/* pedir-carona desativado do fluxo público (redirecionado em rota raiz) */}
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
            <Route path="perto-de-mim" element={L(<PertoDeMim />)} />
            <Route path="rankings" element={<V3Rankings />} />
            <Route path="comunidade" element={<V3Community />} />
            <Route path="jogos" element={L(<Jogos />)} />
            <Route path="jogo/:slug" element={L(<JogoDetail />)} />
            <Route path="auth" element={<V3Auth />} />
          </Route>

          {/* ========= LEGACY V2 (arquivado, NoIndex) ========= */}
          <Route path="/archive/legacy-v2" element={<LegacyArchiveLayout />}>
            <Route index element={L(<LegacyIndex />)} />
            <Route path="evento/:slug" element={L(<LegacyEventDetail />)} />
            <Route path="hoje" element={L(<LegacyHoje />)} />
            <Route path="semana" element={L(<LegacySemana />)} />
            <Route path="categorias" element={L(<LegacyCategorias />)} />
            <Route path="salvos" element={L(<LegacySalvos />)} />
            <Route path="indica" element={L(<LegacyIndica />)} />
            <Route path="local/:slug" element={L(<LegacyLocalDetail />)} />
            <Route path="local/:slug/eventos" element={L(<LegacyLocalEventos />)} />
          </Route>

          {/* ─── Premiações Roxou (página pública) ─── */}
          <Route path="/bar-do-mes" element={L(<BarDoMes />)} />

          {/* ─── SEO Landings (/:landingSlug validado pelo próprio componente) ─── */}
          <Route path="/:landingSlug" element={L(<SEOLanding />)} />

          {/* 404 — qualquer URL não reconhecida */}
          <Route path="*" element={L(<NotFound />)} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
