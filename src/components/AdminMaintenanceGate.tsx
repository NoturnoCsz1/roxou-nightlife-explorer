import { Navigate, useLocation } from "react-router-dom";

/**
 * Catch-all (404). Após a migração V3 -> raiz, qualquer rota não reconhecida
 * volta para a Home (V3) — sem flicker de manutenção.
 */
export default function AdminMaintenanceGate() {
  const { pathname } = useLocation();

  // Redireciona rotas legadas /v3/* permanentemente para a raiz
  if (pathname.startsWith("/v3")) {
    const target = pathname.replace(/^\/v3/, "") || "/";
    return <Navigate to={target} replace />;
  }

  return <Navigate to="/" replace />;
}

/** Helper exportado para componentes detectarem admin debug em runtime. */
export const isAdminDebugActive = () =>
  typeof window !== "undefined" && (window as any).__ROXOU_ADMIN_DEBUG__ === true;
