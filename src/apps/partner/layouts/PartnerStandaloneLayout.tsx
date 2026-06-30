/**
 * PartnerStandaloneLayout — Onda 1 (Partner Pro V2).
 *
 * Camada visual do portal parceiro.roxou.com.br.
 * - Desktop (md+): Sidebar lateral shadcn (collapsible "icon"), header sticky com trigger.
 * - Mobile: Bottom-nav e FAB preservados (compatibilidade total).
 *
 * Gate de acesso (mantido):
 *   - admin Roxou      → acesso total
 *   - partner beta     → acesso ao próprio estabelecimento
 *   - demais usuários  → bloqueado
 */
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { PartnerProvider } from "../contexts/PartnerContext";
import { usePartnerBetaAccess } from "../hooks/usePartnerBetaAccess";

import { PartnerBottomNav } from "../components/PartnerBottomNav";
import { PartnerFab } from "../components/PartnerFab";
import { PartnerSidebar } from "../components/PartnerSidebar";
import { trackBetaEvent } from "../services/partnerBeta";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const ACTION_BY_PATH: Record<string, string> = {
  "/dashboard": "open_dashboard",
  "/perfil": "edit_profile",
  "/eventos": "create_event",
  "/reservas": "open_reservations",
  "/fila": "open_reservations",
  "/relatorios": "open_analytics",
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
      <SidebarProvider defaultOpen>
        <PartnerSidebar />
        <SidebarInset>
          <header
            className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border/40 bg-background/80 px-3 backdrop-blur md:px-4"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <SidebarTrigger className="md:flex hidden" />
            <div className="flex-1 min-w-0">
              <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200 truncate">
                <strong className="font-semibold">BETA</strong> · parceiro.roxou.com.br
                {isAdmin ? (
                  <span className="ml-1.5 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    Admin
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          <div
            className="partner-shell w-full max-w-7xl mx-auto px-3 md:px-4 space-y-4 py-3 pb-24 md:pb-6"
            style={{
              paddingBottom:
                "calc(0.75rem + env(safe-area-inset-bottom) + var(--partner-bottom-nav-h, 68px))",
            }}
          >
            <div className="min-w-0">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <PartnerBottomNav />
      <PartnerFab />
    </PartnerProvider>
  );
};

export default PartnerStandaloneLayout;
