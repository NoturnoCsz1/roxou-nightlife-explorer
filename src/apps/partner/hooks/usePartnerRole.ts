/**
 * usePartnerRole — Onda 1 (Partner Pro V2).
 *
 * Hook unificado para detecção de papel do usuário no portal parceiro.
 * Não cria tabelas nem RPCs — consolida em runtime as fontes que já existem:
 *
 *   1. user_roles (admin global Roxou)         → modo "superAdmin"
 *   2. partner_users.role owner/admin/editor   → modo "manager"
 *   3. partner_users.role attendant            → modo "staff"
 *   4. partner_promoters (e-mail bate, sem partner_users) → modo "promoter"
 *   5. nenhum vínculo                          → modo "none"
 *
 * Regra de prioridade:
 *   superAdmin > manager > staff > promoter > none
 *
 * Esta é a fonte única usada pela sidebar/navegação para gates de menu.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerAuth } from "./usePartnerAuth";

export type PartnerMode = "superAdmin" | "manager" | "staff" | "promoter" | "none";

export interface PartnerRoleState {
  mode: PartnerMode;
  /** True se o usuário também tem painéis administráveis (manager/admin) — controla "trocar contexto". */
  canSwitchToManager: boolean;
  /** True se o login é exclusivamente promoter (sem nenhuma access manager/staff). */
  isPromoterOnly: boolean;
  /** True quando a checagem terminou. */
  ready: boolean;
}

const PROMOTER_FLAG_KEY = "roxou.partner.promoterMode";

function readPromoterFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PROMOTER_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPromoterModeFlag(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(PROMOTER_FLAG_KEY, "1");
    else window.localStorage.removeItem(PROMOTER_FLAG_KEY);
  } catch {
    /* noop */
  }
}

export function usePartnerRole(): PartnerRoleState {
  const { user, partners, role, isLoading } = usePartnerAuth();
  const [isAdminGlobal, setIsAdminGlobal] = useState(false);
  const [hasPromoterMatch, setHasPromoterMatch] = useState(false);
  const [externalReady, setExternalReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        if (!cancelled) {
          setIsAdminGlobal(false);
          setHasPromoterMatch(false);
          setExternalReady(true);
        }
        return;
      }
      const [adminRes, promoterRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .limit(1),
        // partner_promoters não tem user_id hoje: tentamos casar por instagram/phone
        // só quando o usuário não está em partner_users — vide regra de prioridade.
        user.email
          ? supabase
              .from("partner_promoters")
              .select("id")
              .ilike("instagram", `%${user.email.split("@")[0]}%`)
              .eq("is_active", true)
              .limit(1)
          : Promise.resolve({ data: [] as Array<{ id: string }>, error: null }),
      ]);

      if (cancelled) return;
      setIsAdminGlobal((adminRes.data ?? []).length > 0);
      setHasPromoterMatch((promoterRes.data ?? []).length > 0);
      setExternalReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  const ready = !isLoading && externalReady;

  // Prioridade
  const hasManagerAccess = partners.some((p) =>
    p.role === "owner" || p.role === "admin" || p.role === "editor",
  );
  const hasStaffAccess = partners.some((p) => p.role === "attendant");

  let mode: PartnerMode = "none";
  if (isAdminGlobal) mode = "superAdmin";
  else if (hasManagerAccess) mode = "manager";
  else if (hasStaffAccess) mode = "staff";
  else if (hasPromoterMatch) mode = "promoter";

  // Flag manual de "abrir como promoter" (quando o user é manager mas quer ver o painel do promoter)
  const promoterFlag = readPromoterFlag();
  if (promoterFlag && (hasPromoterMatch || mode === "superAdmin" || mode === "manager")) {
    // Em modo promoter manual, ainda permitimos trocar de volta.
    mode = "promoter";
  }

  // Se a checagem de role atual também trouxe info via PartnerContext, respeita.
  if (mode === "none" && role) {
    if (role === "owner" || role === "admin" || role === "editor") mode = "manager";
    else if (role === "attendant") mode = "staff";
  }

  return {
    mode,
    canSwitchToManager: isAdminGlobal || hasManagerAccess,
    isPromoterOnly: mode === "promoter" && !isAdminGlobal && !hasManagerAccess && !hasStaffAccess,
    ready,
  };
}
