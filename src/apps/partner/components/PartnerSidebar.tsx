/**
 * PartnerSidebar — Onda 1 (Partner Pro V2).
 *
 * Sidebar lateral desktop usando shadcn/sidebar, agrupada por contexto.
 * O conteúdo é dirigido por `partnerNavigation.ts` + `usePartnerRole()`.
 * Mobile continua usando PartnerBottomNav (esta sidebar fica `hidden md:flex`).
 */
import { memo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, RefreshCcw, Shield, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { usePartnerRole, setPromoterModeFlag } from "../hooks/usePartnerRole";
import { getNavigationForMode, type NavItem } from "../config/partnerNavigation";

function PartnerSidebarImpl() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { selectedPartner, user } = usePartnerAuth();
  const { mode, canSwitchToManager, ready, isPromoterOnly } = usePartnerRole();

  const groups = ready ? getNavigationForMode(mode) : [];

  const isActive = (item: NavItem) =>
    item.match ? item.match(pathname) : pathname === item.to;

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-md bg-primary/15 text-primary flex items-center justify-center text-[11px] font-black uppercase">
            {(selectedPartner?.name ?? "R").slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">
                {selectedPartner?.name ?? "Roxou Partner"}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-wider">
                  {mode === "superAdmin"
                    ? "Admin"
                    : mode === "manager"
                      ? "Gestor"
                      : mode === "staff"
                        ? "Equipe"
                        : mode === "promoter"
                          ? "Promoter"
                          : "—"}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.id}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={`${group.id}:${item.to}:${item.label}`}>
                      <SidebarMenuButton
                        asChild={!item.comingSoon}
                        isActive={active}
                        tooltip={item.label}
                        disabled={item.comingSoon}
                        className={cn(item.comingSoon && "opacity-50 cursor-not-allowed")}
                      >
                        {item.comingSoon ? (
                          <span className="flex items-center gap-2 text-xs">
                            <Icon className="h-4 w-4 shrink-0" />
                            {!collapsed && (
                              <span className="flex-1 min-w-0 truncate">
                                {item.label}{" "}
                                <span className="text-[9px] uppercase opacity-60">em breve</span>
                              </span>
                            )}
                          </span>
                        ) : (
                          <NavLink to={item.to} end={item.to === "/"} className="flex items-center gap-2 text-xs">
                            <Icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span className="flex-1 min-w-0 truncate">{item.label}</span>}
                            {!collapsed && item.badge && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                {item.badge}
                              </Badge>
                            )}
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 px-2 py-2 space-y-1">
        {/* Trocar contexto: aparece se o promoter também é gestor de algum partner */}
        {mode === "promoter" && canSwitchToManager && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              setPromoterModeFlag(false);
              navigate("/");
              window.location.reload();
            }}
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-2" />
            {!collapsed && "Voltar ao painel"}
          </Button>
        )}
        {mode !== "promoter" && canSwitchToManager && !isPromoterOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              setPromoterModeFlag(true);
              navigate("/promoter-central");
              window.location.reload();
            }}
          >
            <Shield className="h-3.5 w-3.5 mr-2" />
            {!collapsed && "Ver como Promoter"}
          </Button>
        )}
        <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-muted-foreground min-w-0">
          <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span className="truncate">{user?.email ?? "—"}</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export const PartnerSidebar = memo(PartnerSidebarImpl);
export default PartnerSidebar;
