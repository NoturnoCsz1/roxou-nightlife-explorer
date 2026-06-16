/**
 * PartnerPreviewLayout — Fase 9J/9K
 *
 * Layout do Partner Pro Preview.
 *
 * Gate de acesso (Fase 9K):
 *   - admin Roxou      → acesso total
 *   - parceiro beta    → acesso ao próprio estabelecimento
 *   - demais usuários  → bloqueado (mensagem amigável)
 *
 * Envolve as páginas com <PartnerProvider/>, banner "BETA FECHADO", sub-nav
 * entre as seções e o widget flutuante de feedback.
 *
 * Não cria subdomínio, multi-entry nem rota pública.
 */
import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { PartnerProvider } from "../contexts/PartnerContext";
import { usePartnerBetaAccess } from "../hooks/usePartnerBetaAccess";
import { PartnerFeedbackWidget } from "../components/PartnerFeedbackWidget";
import { trackBetaEvent } from "../services/partnerBeta";
import { cn } from "@/lib/utils";

const TABS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/admin/partner-preview", label: "Início", end: true },
  { to: "/admin/partner-preview/dashboard", label: "Dashboard" },
  { to: "/admin/partner-preview/perfil", label: "Perfil" },
  { to: "/admin/partner-preview/eventos", label: "Eventos" },
  { to: "/admin/partner-preview/reservas", label: "Reservas" },
  { to: "/admin/partner-preview/lista-vip", label: "Lista VIP" },
  { to: "/admin/partner-preview/analytics", label: "Analytics" },
  { to: "/admin/partner-preview/configuracoes", label: "Configurações" },
];

const ACTION_BY_PATH: Record<string, string> = {
  "/admin/partner-preview/dashboard": "open_dashboard",
  "/admin/partner-preview/perfil": "edit_profile",
  "/admin/partner-preview/eventos": "create_event",
  "/admin/partner-preview/reservas": "open_reservations",
  "/admin/partner-preview/lista-vip": "open_vip_list",
  "/admin/partner-preview/analytics": "open_analytics",
  "/admin/partner-preview/configuracoes": "open_settings",
};

const PartnerPreviewLayout = () => {
  const { hasAccess, isAdmin, loading, userId } = usePartnerBetaAccess();
  const { pathname } = useLocation();

  // Registra login na primeira chegada ao preview.
  useEffect(() => {
    if (!loading && hasAccess && userId) {
      void trackBetaEvent({ action: "login", page: "/admin/partner-preview" });
    }
  }, [loading, hasAccess, userId]);

  // Registra navegação em seções monitoradas.
  useEffect(() => {
    if (!hasAccess) return;
    const action = ACTION_BY_PATH[pathname];
    if (!action) return;
    void trackBetaEvent({
      action: action as Parameters<typeof trackBetaEvent>[0]["action"],
      page: pathname,
    });
  }, [pathname, hasAccess]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return (
      <main className="mx-auto max-w-lg p-8 text-center">
        <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Beta Fechado
        </span>
        <h1 className="mt-3 text-2xl font-bold">Partner Pro</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O acesso a este ambiente está restrito ao beta fechado de parceiros
          convidados. Se você é um estabelecimento parceiro Roxou, fale com a
          equipe para receber acesso.
        </p>
      </main>
    );
  }

  return (
    <PartnerProvider>
      <div className="w-full max-w-7xl mx-auto px-4 overflow-x-hidden space-y-4 py-3">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 break-words">
          <strong className="font-semibold">BETA FECHADO</strong> · Sujeito a
          alterações
          {isAdmin ? (
            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          ) : null}
        </div>

        <nav className="flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-1 rounded-lg border border-border/40 bg-card/40 p-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
        <PartnerFeedbackWidget />
      </div>
    </PartnerProvider>
  );
};

export default PartnerPreviewLayout;
