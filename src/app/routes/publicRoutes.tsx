import { lazy } from "react";
import { Route, Navigate, useLocation } from "react-router-dom";
import { L } from "./lazyFallback";
import { TransportRoutes } from "./transportRoutes";

// Público — Layout/Home/Auth ficam eager (LCP + entrada) por decisão da Fase 7.
import PublicLayout from "@/components/layouts/PublicLayout";
import V3Auth from "@/pages/v3/V3Auth";
import V3Home from "@/pages/v3/V3Home";

// Maintenance/Legacy layouts continuam eager (usados como wrappers de rotas).
import Maintenance from "@/pages/Maintenance";
import LegacyArchiveLayout from "@/components/LegacyArchiveLayout";
import PedirCaronaGate from "@/components/PedirCaronaGate";

// Notícias
const Contato = lazy(() => import("@/pages/Contato"));
const RoxouNoticias = lazy(() => import("@/pages/RoxouNoticias"));
const RoxouNoticia = lazy(() => import("@/pages/RoxouNoticia"));

// Auth / segurança / privacidade
const UpdatePasswordPage = lazy(
  () => import("@/pages/auth/UpdatePasswordPage"),
);
const SegurancaRevisao = lazy(() => import("@/pages/SegurancaRevisao"));
const PrivacidadeOptOut = lazy(() => import("@/pages/privacidade/OptOutPage"));

// V3
const V3Parceiros = lazy(() => import("@/pages/v3/V3Parceiros"));
const V3Rankings = lazy(() => import("@/pages/v3/V3Rankings"));
const V3Community = lazy(() => import("@/pages/v3/V3Community"));
const V3Discover = lazy(() => import("@/pages/v3/V3Discover"));
const DiscoveryCategoryPage = lazy(
  () => import("@/modules/discovery/pages/DiscoveryCategoryPage"),
);
const V3Agenda = lazy(() => import("@/pages/v3/V3Agenda"));
const V3Profile = lazy(() => import("@/pages/v3/V3Profile"));
const V3ProfileEdit = lazy(() => import("@/pages/v3/V3ProfileEdit"));
const V3EventDetail = lazy(() => import("@/pages/v3/V3EventDetail"));
const V3LocalDetail = lazy(() => import("@/pages/v3/V3LocalDetail"));
const V3Terms = lazy(() => import("@/pages/v3/V3Terms"));
const V3Privacy = lazy(() => import("@/pages/v3/V3Privacy"));
const V3TermsAcceptance = lazy(() => import("@/pages/v3/V3TermsAcceptance"));
const V3Economize = lazy(() => import("@/pages/v3/V3Economize"));
const V3AIChat = lazy(() => import("@/pages/v3/V3AIChat"));
const V3Sobre = lazy(() => import("@/pages/v3/V3Sobre"));
const V3Contato = lazy(() => import("@/pages/v3/V3Contato"));

// Diversos públicos
const PertoDeMim = lazy(() => import("@/pages/PertoDeMim"));
const Jogos = lazy(() => import("@/pages/Jogos"));
const JogoDetail = lazy(() => import("@/pages/JogoDetail"));
const TabelaCampeonato = lazy(() => import("@/pages/TabelaCampeonato"));
const Resultados = lazy(() => import("@/pages/Resultados"));
const RemoverDados = lazy(() => import("@/pages/RemoverDados"));
const CadastroMotorista = lazy(() => import("@/pages/CadastroMotorista"));
const SEOLanding = lazy(() => import("@/pages/SEOLanding"));
const Expo2026 = lazy(() => import("@/pages/Expo2026"));
const ExpoIngressos = lazy(() => import("@/pages/expo2026/Ingressos"));
const ExpoFrontStage = lazy(() => import("@/pages/expo2026/FrontStage"));
const ExpoMapa = lazy(() => import("@/pages/expo2026/Mapa"));
const ExpoMenores = lazy(() => import("@/pages/expo2026/Menores"));
const ExpoInformacoes = lazy(() => import("@/pages/expo2026/Informacoes"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CopaDoMundo2026 = lazy(() => import("@/pages/CopaDoMundo2026"));

// Parceiro público (VIP / reservas)
const PublicVipList = lazy(() => import("@/pages/PublicVipList"));
const PublicVipListSuccess = lazy(
  () => import("@/pages/PublicVipListSuccess"),
);
const PublicReservation = lazy(() => import("@/pages/PublicReservation"));
const PublicReservationSuccess = lazy(
  () => import("@/pages/PublicReservationSuccess"),
);
const PartnerScopedComingSoon = lazy(
  () => import("@/pages/PartnerScopedComingSoon"),
);

// Bio
const PublicBioPage = lazy(() => import("@/pages/bio/PublicBioPage"));
const PublicBioMenuPage = lazy(() => import("@/pages/bio/PublicBioMenuPage"));

// Cliente
const CustomerLogin = lazy(() => import("@/pages/customer/CustomerLogin"));
const CustomerCallback = lazy(
  () => import("@/pages/customer/CustomerCallback"),
);
const CustomerDashboard = lazy(
  () => import("@/pages/customer/CustomerDashboard"),
);
const CustomerReservations = lazy(
  () => import("@/pages/customer/CustomerReservations"),
);
const CustomerAccount = lazy(() => import("@/pages/customer/CustomerAccount"));
const CustomerInvites = lazy(() => import("@/pages/customer/CustomerInvites"));

// Dev / diversos
const BarDoMes = lazy(() => import("@/pages/BarDoMes"));
const DevRoutes = lazy(() => import("@/pages/DevRoutes"));

// Legacy v2
const LegacyIndex = lazy(() => import("@/pages/Index"));
const LegacyEventDetail = lazy(() => import("@/pages/EventDetail"));
const LegacyHoje = lazy(() => import("@/pages/Hoje"));
const LegacySemana = lazy(() => import("@/pages/Semana"));
const LegacyCategorias = lazy(() => import("@/pages/Categorias"));
const LegacySalvos = lazy(() => import("@/pages/Salvos"));
const LegacyIndica = lazy(() => import("@/pages/Indica"));
const LegacyLocalDetail = lazy(() => import("@/pages/LocalDetail"));
const LegacyLocalEventos = lazy(() => import("@/pages/LocalEventos"));

/** Redireciona /v3/* (legado) para o caminho equivalente na raiz. */
function RedirectV3() {
  const { pathname, search, hash } = useLocation();
  const target = pathname.replace(/^\/v3/, "") || "/";
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

export const PublicRoutes = () => (
  <>
    {/* Privacidade / Opt-out */}
    <Route
      path="/privacidade/optout/:token"
      element={L(<PrivacidadeOptOut />)}
    />

    {/* Auth */}
    <Route path="/auth/update-password" element={L(<UpdatePasswordPage />)} />
    <Route path="/auth" element={<V3Auth />} />
    <Route path="/auth/*" element={<V3Auth />} />
    <Route path="/seguranca/revisao" element={L(<SegurancaRevisao />)} />

    {/* Contato */}
    <Route path="/contato" element={L(<Contato />)} />

    {/* Bio */}
    <Route path="/bio/:slug" element={L(<PublicBioPage />)} />
    <Route path="/bio/:slug/menu" element={L(<PublicBioMenuPage />)} />

    {/* Rotas públicas do parceiro (Fase 10F) */}
    <Route path="/:partnerSlug/vip" element={L(<PublicVipList />)} />
    <Route
      path="/:partnerSlug/vip/sucesso/:publicToken"
      element={L(<PublicVipListSuccess />)}
    />
    <Route
      path="/:partnerSlug/eventos"
      element={L(<PartnerScopedComingSoon section="eventos" />)}
    />
    <Route
      path="/:partnerSlug/eventos/:eventSlug"
      element={L(<PartnerScopedComingSoon section="eventos" />)}
    />
    <Route
      path="/:partnerSlug/mesas"
      element={L(<PartnerScopedComingSoon section="mesas" />)}
    />
    <Route path="/:partnerSlug/reservas" element={L(<PublicReservation />)} />
    <Route
      path="/reserva/sucesso/:publicToken"
      element={L(<PublicReservationSuccess />)}
    />

    <Route path="/vip/:listSlug" element={L(<PublicVipList />)} />
    <Route
      path="/vip/:listSlug/sucesso/:publicToken"
      element={L(<PublicVipListSuccess />)}
    />

    {/* Cliente Roxou */}
    <Route path="/cliente" element={L(<CustomerDashboard />)} />
    <Route path="/cliente/login" element={L(<CustomerLogin />)} />
    <Route path="/cliente/callback" element={L(<CustomerCallback />)} />
    <Route
      path="/cliente/minhas-reservas"
      element={L(<CustomerReservations />)}
    />
    <Route
      path="/cliente/lista-vip"
      element={<Navigate to="/cliente/minhas-reservas?tab=vip" replace />}
    />
    <Route path="/cliente/minha-conta" element={L(<CustomerAccount />)} />
    <Route path="/cliente/meus-convites" element={L(<CustomerInvites />)} />

    {/* Dev Navigator */}
    <Route path="/dev/rotas" element={L(<DevRoutes />)} />

    {/* Expo 2026 */}
    <Route path="/expo2026" element={L(<Expo2026 />)} />
    <Route path="/expo2026/ingressos" element={L(<ExpoIngressos />)} />
    <Route path="/expo2026/front-stage" element={L(<ExpoFrontStage />)} />
    <Route path="/expo2026/mapa" element={L(<ExpoMapa />)} />
    <Route path="/expo2026/menores" element={L(<ExpoMenores />)} />
    <Route path="/expo2026/informacoes" element={L(<ExpoInformacoes />)} />
    <Route path="/expoprudente" element={<Navigate to="/expo2026" replace />} />
    <Route
      path="/expoprudente/*"
      element={<Navigate to="/expo2026" replace />}
    />

    {/* Notícias */}
    <Route path="/noticias" element={L(<RoxouNoticias />)} />
    <Route path="/noticia/:slug" element={L(<RoxouNoticia />)} />

    {/* V3 raiz pública */}
    <Route path="/manutencao" element={<Maintenance />} />
    <Route path="/remover-dados" element={L(<RemoverDados />)} />
    <Route path="/cadastro-motorista" element={L(<CadastroMotorista />)} />
    <Route path="/pedir-carona" element={<PedirCaronaGate />} />
    <Route path="/parceiros" element={L(<V3Parceiros />)} />
    <Route path="/resultados" element={L(<Resultados />)} />
    <Route path="/tabela/:slug" element={L(<TabelaCampeonato />)} />

    {/* Redirects 301 /v3/* */}
    <Route path="/v3" element={<Navigate to="/" replace />} />
    <Route path="/v3/*" element={<RedirectV3 />} />

    <Route path="/" element={<V3Layout />}>
      <Route index element={<V3Home />} />
      <Route path="descobrir" element={L(<V3Discover />)} />
      <Route
        path="descobrir/:categorySlug"
        element={L(<DiscoveryCategoryPage />)}
      />
      <Route path="agenda" element={L(<V3Agenda />)} />
      <Route path="perfil" element={L(<V3Profile />)} />
      <Route path="perfil/editar" element={L(<V3ProfileEdit />)} />
      <Route path="evento/:slug" element={L(<V3EventDetail />)} />
      <Route path="local/:slug" element={L(<V3LocalDetail />)} />

      {/* Sub-árvore de Transporte (isolada em transportRoutes.tsx) */}
      {TransportRoutes()}

      <Route path="terms" element={L(<V3Terms />)} />
      <Route path="privacy" element={L(<V3Privacy />)} />
      <Route path="terms-acceptance" element={L(<V3TermsAcceptance />)} />
      <Route path="economize" element={L(<V3Economize />)} />
      <Route path="ia" element={L(<V3AIChat />)} />
      <Route path="sobre" element={L(<V3Sobre />)} />
      <Route path="contato" element={L(<V3Contato />)} />
      <Route path="perto-de-mim" element={L(<PertoDeMim />)} />
      <Route path="rankings" element={L(<V3Rankings />)} />
      <Route path="comunidade" element={L(<V3Community />)} />
      <Route path="jogos" element={L(<Jogos />)} />
      <Route path="copa-do-mundo-2026" element={L(<CopaDoMundo2026 />)} />
      <Route path="jogo/:slug" element={L(<JogoDetail />)} />
      <Route path="auth" element={<V3Auth />} />
    </Route>

    {/* Legacy v2 */}
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

    {/* Premiações Roxou */}
    <Route path="/bar-do-mes" element={L(<BarDoMes />)} />

    {/* SEO landings */}
    <Route path="/:landingSlug" element={L(<SEOLanding />)} />

    {/* 404 */}
    <Route path="*" element={L(<NotFound />)} />
  </>
);
