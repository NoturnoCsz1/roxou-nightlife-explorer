import { Routes, Route, Navigate } from "react-router-dom";
import { useV3Profile } from "@/hooks/useV3Profile";
import Maintenance from "@/pages/Maintenance";

// Páginas públicas legadas
import Index from "@/pages/Index";
import EventDetail from "@/pages/EventDetail";
import Hoje from "@/pages/Hoje";
import Semana from "@/pages/Semana";
import Categorias from "@/pages/Categorias";
import Salvos from "@/pages/Salvos";
import Indica from "@/pages/Indica";
import LocalDetail from "@/pages/LocalDetail";
import LocalEventos from "@/pages/LocalEventos";
import NotFound from "@/pages/NotFound";

// V3
import V3Layout from "@/components/v3/V3Layout";
import V3Home from "@/pages/v3/V3Home";
import V3Discover from "@/pages/v3/V3Discover";
import V3Agenda from "@/pages/v3/V3Agenda";
import V3Profile from "@/pages/v3/V3Profile";
import V3EventDetail from "@/pages/v3/V3EventDetail";
import V3LocalDetail from "@/pages/v3/V3LocalDetail";
import V3Transport from "@/pages/v3/V3Transport";
import V3RideRequest from "@/pages/v3/V3RideRequest";
import V3DriverBoard from "@/pages/v3/V3DriverBoard";
import V3Chat from "@/pages/v3/V3Chat";
import V3MyRides from "@/pages/v3/V3MyRides";
import V3Terms from "@/pages/v3/V3Terms";
import V3Privacy from "@/pages/v3/V3Privacy";
import V3TermsAcceptance from "@/pages/v3/V3TermsAcceptance";
import V3Auth from "@/pages/v3/V3Auth";

/**
 * Catch-all: usuários comuns veem Manutenção. Admins veem o app completo
 * (libera testes do app inteiro antes do lançamento público).
 */
export default function AdminMaintenanceGate() {
  const { isAdmin, loading } = useV3Profile();

  if (loading) {
    // Sem flicker: deixa a Manutenção como fallback enquanto resolve auth
    return <Maintenance />;
  }

  if (!isAdmin) {
    return <Maintenance />;
  }

  // Debug mode para admins: log de carregamento dos módulos críticos
  if (typeof window !== "undefined" && !(window as any).__ROXOU_ADMIN_DEBUG__) {
    (window as any).__ROXOU_ADMIN_DEBUG__ = true;
    // eslint-disable-next-line no-console
    console.info(
      "%c[ROXOU ADMIN DEBUG]%c Modo debug ativo — monitorando parceiros, eventos, mapbox e analytics.",
      "background:#7c3aed;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold",
      "color:#a78bfa"
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/evento/:slug" element={<EventDetail />} />
      <Route path="/hoje" element={<Hoje />} />
      <Route path="/semana" element={<Semana />} />
      <Route path="/categorias" element={<Categorias />} />
      <Route path="/salvos" element={<Salvos />} />
      <Route path="/indica" element={<Indica />} />
      <Route path="/local/:slug" element={<LocalDetail />} />
      <Route path="/local/:slug/eventos" element={<LocalEventos />} />

      <Route path="/v3" element={<V3Layout />}>
        <Route index element={<V3Home />} />
        <Route path="descobrir" element={<V3Discover />} />
        <Route path="agenda" element={<V3Agenda />} />
        <Route path="perfil" element={<V3Profile />} />
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
        <Route path="auth" element={<V3Auth />} />
      </Route>

      <Route path="/manutencao" element={<Maintenance />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Helper exportado para componentes detectarem admin debug em runtime. */
export const isAdminDebugActive = () =>
  typeof window !== "undefined" && (window as any).__ROXOU_ADMIN_DEBUG__ === true;
