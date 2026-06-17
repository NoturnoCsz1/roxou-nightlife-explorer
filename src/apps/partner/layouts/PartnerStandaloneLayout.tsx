/**
 * PartnerStandaloneLayout — Fase 9M.
 *
 * Layout do Partner Pro quando servido em parceiro.roxou.com.br.
 * Espelha PartnerPreviewLayout mas usa rotas na raiz ("/", "/dashboard", ...).
 *
 * Gate:
 *   - admin Roxou      → acesso total
 *   - partner beta     → acesso ao próprio estabelecimento
 *   - demais usuários  → bloqueado
 *
 * Não cria cadastro público, não muda RLS, não toca em edge functions.
 */
import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { PartnerProvider } from "../contexts/PartnerContext";
import { usePartnerBetaAccess } from "../hooks/usePartnerBetaAccess";
import { PartnerFeedbackWidget } from "../components/PartnerFeedbackWidget";
import { PartnerBottomNav } from "../components/PartnerBottomNav";
import { trackBetaEvent } from "../services/partnerBeta";
import { cn } from "@/lib/utils";

const TABS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/", label: "Início", end: true },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/perfil", label: "Perfil" },
  { to: "/eventos", label: "Eventos" },
  { to: "/reservas", label: "Reservas" },
  { to: "/lista-vip", label: "Lista VIP" },
  { to: "/validator", label: "Validador" },
  { to: "/analytics", label: "Analytics" },
  { to: "/configuracoes", label: "Configurações" },
];

const ACTION_BY_PATH: Record<string, string> = {
  "/dashboard": "open_dashboard",
  "/perfil": "edit_profile",
  "/eventos": "create_event",
  "/reservas": "open_reservations",
  "/lista-vip": "open_vip_list",
  "/analytics": "open_analytics",
  "/configuracoes": "open_settings",
};

const PartnerStandaloneLayout = () => {
  const { hasAccess, isAdmin, loading, userId } = usePartnerBetaAccess();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && hasAccess && userId) {
      void trackBetaEvent({ action: "login", page: "/" });
    }
  }, [loading, hasAccess, userId]);

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
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/onboarding" replace />;
  }


  return (
    <PartnerProvider>
      <div
        className="partner-shell w-full max-w-7xl mx-auto px-4 space-y-4 py-3 pb-24 md:pb-3"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
          paddingBottom:
            "calc(0.75rem + env(safe-area-inset-bottom) + var(--partner-bottom-nav-h, 68px))",
        }}
      >
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 break-words">
          <strong className="font-semibold">BETA FECHADO</strong> · parceiro.roxou.com.br
          {isAdmin ? (
            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          ) : null}
        </div>

        <nav
          className="flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-1 rounded-lg border border-border/40 bg-card/40 p-1"
          style={{ scrollSnapType: "x proximity" }}
        >
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              style={{ scrollSnapAlign: "start" }}
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

export default PartnerStandaloneLayout;
