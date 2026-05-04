import { Routes, Route, Navigate } from "react-router-dom";
import { useV3Profile } from "@/hooks/useV3Profile";
import Maintenance from "@/pages/Maintenance";

// Páginas legadas removidas do gate — agora vivem em /archive/legacy-v2/* (ver App.tsx).

// V3
import V3Layout from "@/components/V3Layout";
import V3Home from "@/pages/V3Home";
import V3Discover from "@/pages/V3Discover";
import V3Agenda from "@/pages/V3Agenda";
import V3Profile from "@/pages/V3Profile";
import V3EventDetail from "@/pages/V3EventDetail";
import V3LocalDetail from "@/pages/V3LocalDetail";
import V3Transport from "@/pages/V3Transport";
import V3RideRequest from "@/pages/V3RideRequest";
import V3DriverBoard from "@/pages/V3DriverBoard";
import V3Chat from "@/pages/V3Chat";
import V3MyRides from "@/pages/V3MyRides";
import V3Terms from "@/pages/V3Terms";
import V3Privacy from "@/pages/V3Privacy";
import V3TermsAcceptance from "@/pages/V3TermsAcceptance";
import V3Auth from "@/pages/V3Auth";

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
      {/* Para admins logados, raiz vai direto para V3 Home (padrão pós-lançamento). */}
      <Route path="/" element={<Navigate to="/" replace />} />

      {/* Rotas legadas v2 redirecionadas para o arquivo (admins ainda podem inspecionar). */}
      <Route path="/evento/:slug" element={<Navigate to="/archive/legacy-v2" replace />} />
      <Route path="/hoje" element={<Navigate to="/archive/legacy-v2/hoje" replace />} />
      <Route path="/semana" element={<Navigate to="/archive/legacy-v2/semana" replace />} />
      <Route path="/categorias" element={<Navigate to="/archive/legacy-v2/categorias" replace />} />
      <Route path="/salvos" element={<Navigate to="/archive/legacy-v2/salvos" replace />} />
      <Route path="/indica" element={<Navigate to="/archive/legacy-v2/indica" replace />} />
      <Route path="/local/:slug" element={<Navigate to="/archive/legacy-v2" replace />} />
      <Route path="/local/:slug/eventos" element={<Navigate to="/archive/legacy-v2" replace />} />

      <Route path="/" element={<V3Layout />}>
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
