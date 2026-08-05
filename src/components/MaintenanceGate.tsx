import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  MAINTENANCE_CONFIG,
  isAdminLoginPath,
  isAdminPath,
  isAllowedPublicPath,
  isBypassedHost,
} from "@/config/maintenance";
import { useAdminProfile } from "@/hooks/useAdminProfile";

/**
 * Guard de manutenção — aplicado no nível mais alto do roteamento.
 * Toda a lógica condicional vive aqui e em `src/config/maintenance.ts`.
 */

const Blocking = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0510]">
    <div
      className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin"
      role="status"
      aria-label="Carregando"
    />
  </div>
);

/** Admin: só entra quem estiver autenticado E com papel administrativo real. */
function AdminMaintenanceGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAdminProfile();
  if (loading) return <Blocking />;
  if (!isAdmin) return <Navigate to="/manutencao" replace />;
  return <>{children}</>;
}

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  if (!MAINTENANCE_CONFIG.enabled) return <>{children}</>;
  if (isBypassedHost()) return <>{children}</>;
  if (isAllowedPublicPath(pathname)) return <>{children}</>;
  if (isAdminLoginPath(pathname)) return <>{children}</>;
  if (isAdminPath(pathname))
    return <AdminMaintenanceGuard>{children}</AdminMaintenanceGuard>;

  return <Navigate to="/manutencao" replace />;
}

export default MaintenanceGate;
